const express = require("express");
let XLSX;
try {
  // Style-aware compatible writer enables branded headers, banded rows and cover-sheet styling.
  XLSX = require("xlsx-js-style");
} catch (error) {
  // Fallback keeps report exports available before dependencies are reinstalled.
  XLSX = require("xlsx");
  console.warn("xlsx-js-style is not installed; Excel visual styles may be limited. Run npm install.");
}
const router = express.Router();
const db = require("../database/database");

const qAll = (sql, params=[]) => new Promise((resolve, reject) => db.all(sql, params, (err, rows) => err ? reject(err) : resolve(rows || [])));
const qGet = (sql, params=[]) => new Promise((resolve, reject) => db.get(sql, params, (err, row) => err ? reject(err) : resolve(row || {})));
const clean = value => String(value || "").trim();
const escapeLike = value => clean(value).replace(/[\\%_]/g, m => `\\${m}`);

function makeSheet(title, subtitle, rows, options={}) {
  const ws = XLSX.utils.aoa_to_sheet([["ROF | ASSET MANAGEMENT"], [title], [subtitle], []]);
  const data = rows || [];
  if (data.length) XLSX.utils.sheet_add_json(ws, data, { origin:"A5", skipHeader:false });
  else XLSX.utils.sheet_add_aoa(ws, [["No records match the selected filters."]], { origin:"A5" });
  const ref = ws["!ref"] || "A1:A5";
  const range = XLSX.utils.decode_range(ref);
  const headers = data.length ? Object.keys(data[0]) : ["Information"];
  const widths = headers.map((header, col) => {
    let max = String(header).length;
    data.forEach(row => { const val = row[header]; max = Math.max(max, String(val == null ? "" : val).length); });
    return { wch: Math.min(Math.max(max + 2, 12), 38) };
  });
  ws["!cols"] = widths;
  // ROF branded report styling: navy title band, light-blue section headers, zebra rows.
  const navy = "0F2A47", blue = "1565C0", paleBlue = "E3F2FD", veryPale = "F5F9FF";
  const border = {top:{style:"thin",color:{rgb:"D7E3F1"}},bottom:{style:"thin",color:{rgb:"D7E3F1"}},left:{style:"thin",color:{rgb:"D7E3F1"}},right:{style:"thin",color:{rgb:"D7E3F1"}}};
  const lastCol = Math.max(0, headers.length - 1);
  for (let c=0; c<=lastCol; c++) {
    const c1 = XLSX.utils.encode_cell({r:0,c}), c2 = XLSX.utils.encode_cell({r:1,c}), c3 = XLSX.utils.encode_cell({r:2,c});
    if (ws[c1]) ws[c1].s = {font:{name:"Aptos Display",sz:11,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:navy}},alignment:{vertical:"center"},border};
    if (ws[c2]) ws[c2].s = {font:{name:"Aptos Display",sz:18,bold:true,color:{rgb:navy}},fill:{patternType:"solid",fgColor:{rgb:paleBlue}},alignment:{vertical:"center"},border};
    if (ws[c3]) ws[c3].s = {font:{name:"Aptos",sz:10,italic:true,color:{rgb:"475569"}},fill:{patternType:"solid",fgColor:{rgb:veryPale}},alignment:{vertical:"center",wrapText:true},border};
    const h = ws[XLSX.utils.encode_cell({r:4,c})];
    if (h) h.s = {font:{name:"Aptos",sz:10,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:blue}},alignment:{horizontal:"center",vertical:"center",wrapText:true},border};
  }
  data.forEach((row,r)=>headers.forEach((header,col)=>{
    const cell=ws[XLSX.utils.encode_cell({r:r+5,c:col})];
    if(cell) cell.s={font:{name:"Aptos",sz:10,color:{rgb:"0F2A47"}},alignment:{vertical:"top",wrapText:/description|remarks|problem|condition/i.test(header)},border,...(r%2 ? {fill:{patternType:"solid",fgColor:{rgb:"EEF5FC"}}}:{})};
  }));
  ws["!merges"] = [
    {s:{r:0,c:0},e:{r:0,c:Math.max(0,headers.length-1)}},
    {s:{r:1,c:0},e:{r:1,c:Math.max(0,headers.length-1)}},
    {s:{r:2,c:0},e:{r:2,c:Math.max(0,headers.length-1)}}
  ];
  ws["!autofilter"] = { ref: `A5:${XLSX.utils.encode_col(Math.max(0,headers.length-1))}${Math.max(5,range.e.r+1)}` };
  ws["!freeze"] = { xSplit:0, ySplit:5 };
  ws["!rows"] = [{hpt:24},{hpt:30},{hpt:20},{hpt:8},{hpt:26}];
  return ws;
}

router.get("/assets/excel", async (req, res) => {
  try {
    const status = clean(req.query.status);
    const assetType = clean(req.query.assetType);
    const department = clean(req.query.department);
    const location = clean(req.query.location);
    const fromDate = clean(req.query.fromDate);
    const toDate = clean(req.query.toDate);
    const reportType = clean(req.query.reportType) || "all";
    const params = [];
    let where = " WHERE 1=1 ";
    if (status) { where += " AND a.status = ?"; params.push(status); }
    if (assetType) { where += " AND a.asset_type = ?"; params.push(assetType); }
    if (department) { where += " AND a.department LIKE ? ESCAPE '\\'"; params.push(`%${escapeLike(department)}%`); }
    if (location) { where += " AND a.location LIKE ? ESCAPE '\\'"; params.push(`%${escapeLike(location)}%`); }
    if (fromDate) { where += " AND date(COALESCE(a.created_at, a.purchase_date)) >= date(?)"; params.push(fromDate); }
    if (toDate) { where += " AND date(COALESCE(a.created_at, a.purchase_date)) <= date(?)"; params.push(toDate); }

    const assetSql = `SELECT a.asset_id AS "Asset ID", a.asset_type AS "Asset Type", a.brand AS Brand, a.model AS Model,
      a.serial_number AS "Serial Number", a.purchase_date AS "Purchase Date", a.purchase_cost AS "Purchase Cost", a.vendor AS Vendor,
      a.warranty_expiry AS "Warranty Expiry", a.department AS Department, a.location AS Location, a.status AS Status, a.condition AS Condition,
      (SELECT employee_name FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS "Assigned To",
      (SELECT employee_id FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS "Employee ID",
      (SELECT employee_email FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS "Employee Email",
      (SELECT employee_mobile FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS "Employee Mobile",
      (SELECT designation FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS Designation,
      (SELECT assignment_date FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS "Assignment Date",
      (SELECT expected_return_date FROM asset_assignments WHERE asset_id=a.asset_id AND status='Assigned' ORDER BY id DESC LIMIT 1) AS "Expected Return Date",
      a.remarks AS Remarks, a.created_at AS "Record Created" FROM assets a ${where} ORDER BY a.asset_id`;

    const assets = await qAll(assetSql, params);
    const [allCounts, assignmentHistory, repairs, activity, sessions, imports, depts, types, locs] = await Promise.all([
      qGet(`SELECT COUNT(*) AS total, SUM(CASE WHEN status='Assigned' THEN 1 ELSE 0 END) AS assigned,
        SUM(CASE WHEN status='Available' THEN 1 ELSE 0 END) AS available, SUM(CASE WHEN status='Under Repair' THEN 1 ELSE 0 END) AS repair,
        SUM(CASE WHEN status='Retired' THEN 1 ELSE 0 END) AS retired FROM assets`),
      qAll(`SELECT aa.id AS "Transaction ID", aa.asset_id AS "Asset ID", a.asset_type AS "Asset Type", a.brand AS Brand, a.model AS Model,
        a.serial_number AS "Serial Number", aa.employee_id AS "Employee ID", aa.employee_name AS "Employee Name", aa.employee_email AS "Employee Email",
        aa.employee_mobile AS "Employee Mobile", aa.designation AS Designation, aa.department AS Department, aa.location AS Location,
        aa.assignment_date AS "Assignment Date", aa.expected_return_date AS "Expected Return Date", aa.returned_date AS "Returned Date",
        aa.handover_condition AS "Condition Out", aa.return_condition AS "Condition In", aa.status AS Status, aa.assignment_remarks AS Remarks
        FROM asset_assignments aa LEFT JOIN assets a ON a.asset_id=aa.asset_id
        WHERE (?='' OR a.status=?) AND (?='' OR a.asset_type=?) AND (?='' OR COALESCE(aa.department,a.department,'') LIKE '%' || ? || '%')
          AND (?='' OR COALESCE(aa.location,a.location,'') LIKE '%' || ? || '%')
          AND (?='' OR date(aa.assignment_date)>=date(?)) AND (?='' OR date(aa.assignment_date)<=date(?))
        ORDER BY aa.id DESC`, [status,status,assetType,assetType,department,department,location,location,fromDate,fromDate,toDate,toDate]),
      qAll(`SELECT id AS "Repair ID", asset_id AS "Asset ID", repair_date AS "Repair Date", problem AS Problem, sent_to AS "Sent To",
        repair_status AS "Repair Status", received_date AS "Received Date", repair_cost AS "Repair Cost", condition_after AS "Condition After", remarks AS Remarks
        FROM repair_history WHERE (?='' OR date(repair_date)>=date(?)) AND (?='' OR date(repair_date)<=date(?)) ORDER BY id DESC`, [fromDate,fromDate,toDate,toDate]),
      qAll(`SELECT * FROM (
        SELECT id AS ID, username AS Username, full_name AS "Full Name", action_type AS Action, asset_id AS "Asset ID", description AS Description,
          ip_address AS "IP Address", created_at AS "Date & Time", 'User Audit Log' AS Source FROM user_activity_log
        UNION ALL
        SELECT id AS ID, 'System' AS Username, 'Asset History' AS "Full Name", activity_type AS Action, asset_id AS "Asset ID", description AS Description,
          '' AS "IP Address", created_at AS "Date & Time", 'Asset History' AS Source FROM activity_history
      ) WHERE (?='' OR date("Date & Time")>=date(?)) AND (?='' OR date("Date & Time")<=date(?)) ORDER BY datetime("Date & Time") DESC`, [fromDate,fromDate,toDate,toDate]),
      qAll(`SELECT id AS ID, username AS Username, login_time AS "Login Time", logout_time AS "Logout Time", last_activity AS "Last Activity",
        ip_address AS "IP Address", session_status AS Status FROM user_sessions WHERE (?='' OR date(login_time)>=date(?)) AND (?='' OR date(login_time)<=date(?)) ORDER BY id DESC`, [fromDate,fromDate,toDate,toDate]),
      qAll(`SELECT id AS "Import ID", username AS Username, file_name AS "File Name", total_rows AS "Total Rows", imported_rows AS Imported,
        skipped_rows AS Skipped, invalid_rows AS Invalid, created_at AS "Imported At" FROM import_history
        WHERE (?='' OR date(created_at)>=date(?)) AND (?='' OR date(created_at)<=date(?)) ORDER BY id DESC`, [fromDate,fromDate,toDate,toDate]),
      qAll("SELECT DISTINCT department AS value FROM assets WHERE COALESCE(department,'')<>'' ORDER BY department"),
      qAll("SELECT DISTINCT asset_type AS value FROM assets WHERE COALESCE(asset_type,'')<>'' ORDER BY asset_type"),
      qAll("SELECT DISTINCT location AS value FROM assets WHERE COALESCE(location,'')<>'' ORDER BY location")
    ]);

    const reportUser = req.session?.user || {};
    const generatedAt = new Date();
    const wb = XLSX.utils.book_new();
    const filtersText = [`Status: ${status||"All"}`,`Type: ${assetType||"All"}`,`Department: ${department||"All"}`,`Location: ${location||"All"}`,`From: ${fromDate||"—"}`,`To: ${toDate||"—"}`].join(" | ");
    const cover = [
      ["ROF | ASSET MANAGEMENT", "", "", "", "", "", ""],
      ["ASSET INVENTORY, ISSUANCE & AUDIT REPORT", "", "", "", "", "", ""],
      ["Generated At", generatedAt.toLocaleString("en-IN"), "Generated By", reportUser.full_name||reportUser.username||"System", "", "", ""],
      ["Applied Filters", filtersText, "", "", "", "", ""],
      ["", "", "", "", "", "", ""],
      ["ASSET OVERVIEW", "", "", "", "", "", ""],
      ["Metric", "Total Assets", "Assigned", "Available", "Under Repair", "Retired", "Assets in This Report"],
      ["Count", allCounts.total||0, allCounts.assigned||0, allCounts.available||0, allCounts.repair||0, allCounts.retired||0, assets.length],
      ["", "", "", "", "", "", ""],
      ["REPORT CONTENTS", "", "", "", "", "", ""],
      ["Report Section", "Records", "Description", "", "", "", ""],
      ["All Assets", assets.length, "Assets matching the selected filters", "", "", "", ""],
      ["Assignment History", assignmentHistory.length, "Asset issue and return records", "", "", "", ""],
      ["Repair History", repairs.length, "Repair and maintenance records", "", "", "", ""],
      ["User Activity", activity.length, "Recorded user and system actions", "", "", "", ""],
      ["User Sessions", sessions.length, "Login/session history", "", "", "", ""],
      ["Import History", imports.length, "Asset import records", "", "", "", ""],
      ["Report Notes", "", "Detailed worksheets include filters, frozen headings and adjusted column widths.", "", "", "", ""]
    ];
    const coverWs = XLSX.utils.aoa_to_sheet(cover);
    const navy = "0F2A47", blue = "1565C0", paleBlue = "E3F2FD", veryPale = "F5F9FF", borderColor = "D5DDD7", textColor = "26312B";
    const coverBorder = {top:{style:"thin",color:{rgb:borderColor}},bottom:{style:"thin",color:{rgb:borderColor}},left:{style:"thin",color:{rgb:borderColor}},right:{style:"thin",color:{rgb:borderColor}}};
    const styleCell = (r,c,style) => { const cell=coverWs[XLSX.utils.encode_cell({r,c})]; if(cell) cell.s={...style,border:coverBorder}; };
    // Full-width title bars and clearly labelled report metadata.
    for(let c=0;c<7;c++) {
      styleCell(0,c,{font:{name:"Aptos Display",sz:20,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:navy}},alignment:{vertical:"center",horizontal:"left"}});
      styleCell(1,c,{font:{name:"Aptos",sz:12,bold:true,color:{rgb:navy}},fill:{patternType:"solid",fgColor:{rgb:paleBlue}},alignment:{vertical:"center",horizontal:"left"}});
      styleCell(5,c,{font:{name:"Aptos",sz:11,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:blue}},alignment:{vertical:"center"}});
      styleCell(9,c,{font:{name:"Aptos",sz:11,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:blue}},alignment:{vertical:"center"}});
    }
    for(let c=0;c<7;c++) {
      styleCell(2,c,{font:{name:"Aptos",sz:10,bold:c===0||c===2,color:{rgb:navy}},fill:{patternType:"solid",fgColor:{rgb:veryPale}},alignment:{vertical:"center",wrapText:true}});
      styleCell(3,c,{font:{name:"Aptos",sz:10,bold:c===0,color:{rgb:textColor}},fill:{patternType:"solid",fgColor:{rgb:c===0?paleBlue:"F8FAFC"}},alignment:{vertical:"center",wrapText:true}});
      styleCell(6,c,{font:{name:"Aptos",sz:10,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:navy}},alignment:{vertical:"center",horizontal:"center",wrapText:true}});
      styleCell(10,c,{font:{name:"Aptos",sz:10,bold:true,color:{rgb:"FFFFFF"}},fill:{patternType:"solid",fgColor:{rgb:navy}},alignment:{vertical:"center",horizontal:"center",wrapText:true}});
    }
    for(let c=0;c<7;c++) {
      styleCell(7,c,{font:{name:"Aptos",sz:12,bold:true,color:{rgb:c===0?navy:blue}},fill:{patternType:"solid",fgColor:{rgb:c===0?paleBlue:(c%2===0?veryPale:"FFFFFF")}},alignment:{vertical:"center",horizontal:"center",wrapText:true}});
    }
    for(let r=11;r<cover.length;r++) for(let c=0;c<7;c++) {
      styleCell(r,c,{font:{name:"Aptos",sz:10,bold:c===0,color:{rgb:textColor}},fill:{patternType:"solid",fgColor:{rgb:r%2===0?"F1F5F9":"FFFFFF"}},alignment:{vertical:"center",wrapText:true}});
    }
    coverWs["!merges"] = [
      {s:{r:0,c:0},e:{r:0,c:6}},
      {s:{r:1,c:0},e:{r:1,c:6}},
      {s:{r:3,c:1},e:{r:3,c:6}},
      {s:{r:5,c:0},e:{r:5,c:6}},
      {s:{r:9,c:0},e:{r:9,c:6}},
      {s:{r:11,c:2},e:{r:11,c:6}},
      {s:{r:12,c:2},e:{r:12,c:6}},
      {s:{r:13,c:2},e:{r:13,c:6}},
      {s:{r:14,c:2},e:{r:14,c:6}},
      {s:{r:15,c:2},e:{r:15,c:6}},
      {s:{r:16,c:2},e:{r:16,c:6}},
      {s:{r:17,c:2},e:{r:17,c:6}}
    ];
    coverWs["!cols"] = [{wch:25},{wch:22},{wch:24},{wch:18},{wch:18},{wch:18},{wch:23}];
    coverWs["!rows"] = [{hpt:38},{hpt:27},{hpt:25},{hpt:38},{hpt:10},{hpt:25},{hpt:30},{hpt:34},{hpt:10},{hpt:25},{hpt:26},{hpt:25},{hpt:25},{hpt:25},{hpt:25},{hpt:25},{hpt:25},{hpt:38}];
    coverWs["!freeze"] = {xSplit:0,ySplit:2};
    coverWs["!pageSetup"] = {orientation:"landscape",fitToWidth:1,fitToHeight:1};
    coverWs["!margins"] = {left:0.25,right:0.25,top:0.5,bottom:0.5,header:0.2,footer:0.2};
    XLSX.utils.book_append_sheet(wb, coverWs, "Report Summary");

    const sheets = [
      ["All Assets", assets], ["Assignment History", assignmentHistory], ["Repair History", repairs],
      ["User Activity", activity], ["User Sessions", sessions], ["Import History", imports]
    ];
    sheets.forEach(([name, rows]) => {
      if (reportType !== "all" && reportType !== name) return;
      XLSX.utils.book_append_sheet(wb, makeSheet(name, `Generated ${generatedAt.toLocaleString("en-IN")} | ${filtersText}`, rows), name);
    });
    wb.Props = {Title:"ROF Asset Management Report", Subject:"Live inventory and activity report", Author:reportUser.full_name||reportUser.username||"ROF IT Department", Company:"ROF", CreatedDate:generatedAt};
    const buffer = XLSX.write(wb, {type:"buffer", bookType:"xlsx", cellStyles:true});

    db.run(`INSERT INTO user_activity_log (user_id, username, full_name, action_type, description, asset_id, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [reportUser.id||null,reportUser.username||"",reportUser.full_name||"","Report Exported",
      `Excel report exported. Type=${reportType}; Filters=${filtersText}`,"",req.ip||"",req.get("user-agent")||""], err => {
        if (err) console.error("Report export audit error:", err.message);
        res.setHeader("Content-Type","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition",`attachment; filename="ROF_${reportType.replace(/[^a-z0-9]+/gi,"_")}_Report_${generatedAt.toISOString().slice(0,10)}.xlsx"`);
        res.setHeader("Content-Length",buffer.length);
        res.send(buffer);
      });
  } catch (error) {
    console.error("Excel generation error:", error);
    res.status(500).json({success:false,message:"Unable to create Excel report. Please check report filters and database."});
  }
});

router.get("/backup", async (req,res) => {
  const tables = ["assets","asset_assignments","activity_history","repair_history","users","user_permissions","user_activity_log","user_sessions","import_history"];
  try {
    const result = {};
    for (const table of tables) result[table] = await qAll(`SELECT * FROM ${table}`);
    result.meta = {format:"ROF_ASSET_BACKUP_V1",created_at:new Date().toISOString()};
    res.setHeader("Content-Type","application/json");
    res.setHeader("Content-Disposition",'attachment; filename="ROF_Full_Backup.json"');
    res.send(Buffer.from(JSON.stringify(result,null,2)));
  } catch (error) { res.status(500).json({success:false,message:"Unable to create backup."}); }
});

router.post("/restore", (req,res) => {
  const backup = req.body;
  if (!backup || backup.meta?.format !== "ROF_ASSET_BACKUP_V1") return res.status(400).json({success:false,message:"Invalid ROF backup file."});
  const order = ["assets","asset_assignments","activity_history","repair_history","users","user_permissions","user_activity_log","user_sessions","import_history"];
  db.serialize(() => {
    db.run("PRAGMA foreign_keys = OFF");
    const next = i => {
      if (i >= order.length) { db.run("PRAGMA foreign_keys = ON"); return res.json({success:true,message:"Full backup restored successfully."}); }
      const table=order[i];
      db.run(`DELETE FROM ${table}`, err => {
        if(err) return res.status(500).json({success:false,message:`Unable to clear ${table}.`});
        const rows=Array.isArray(backup[table])?backup[table]:[];
        let j=0;
        const insert=()=>{
          if(j>=rows.length) return next(i+1);
          const row=rows[j++], cols=Object.keys(row), placeholders=cols.map(()=>"?").join(",");
          db.run(`INSERT INTO ${table} (${cols.join(",")}) VALUES (${placeholders})`,cols.map(c=>row[c]), e=> e ? res.status(500).json({success:false,message:`Unable to restore ${table}: ${e.message}`}) : insert());
        };
        insert();
      });
    };
    next(0);
  });
});
module.exports = router;
