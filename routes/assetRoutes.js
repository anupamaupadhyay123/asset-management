const express = require("express");
const XLSX = require("xlsx");
const multer = require("multer");

const router = express.Router();

const db = require("../database/database");


// ============================================================
// MULTER
// ============================================================

const upload = multer({

    storage:
        multer.memoryStorage(),

    limits: {

        fileSize:
            10 * 1024 * 1024

    }

});


// ============================================================
// GET ALL ASSETS
// ============================================================

router.get(
    "/",
    (req, res) => {

        const query = `

            SELECT

                a.*,

                (
                    SELECT employee_name
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_to,

                (
                    SELECT employee_id
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_employee_id,

                (
                    SELECT employee_email
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_employee_email,

                (
                    SELECT employee_mobile
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_employee_mobile,

                (
                    SELECT COALESCE(NULLIF(designation,''), employee_designation, '')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_designation,

                (
                    SELECT COALESCE(NULLIF(department,''), employee_department, '')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_department,

                (
                    SELECT COALESCE(NULLIF(location,''), employee_location, '')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_location,

                (
                    SELECT assignment_date
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_date,

                (
                    SELECT expected_return_date
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_expected_return_date,

                (
                    SELECT COALESCE(issued_by,'')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_issued_by

            FROM assets a

            ORDER BY CAST(SUBSTR(a.asset_id, 5) AS INTEGER) ASC, a.asset_id ASC

        `;


        db.all(
            query,
            [],
            (error, rows) => {

                if (error) {

                    console.error(
                        "Error fetching assets:",
                        error.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to fetch assets."

                    });

                }


                res.json({

                    success: true,

                    assets: rows

                });

            }
        );

    }
);


// ============================================================
// GET NEXT ASSET ID
// ============================================================

router.get(
    "/next-id",
    (req, res) => {

        const query = `

            SELECT asset_id

            FROM assets

        `;


        db.all(
            query,
            [],
            (error, rows) => {

                if (error) {

                    console.error(
                        "Asset ID error:",
                        error.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to generate Asset ID."

                    });

                }


                let nextNumber = 1;

                (rows || []).forEach(item => {
                    const match = String(item.asset_id || "")
                        .match(/^(?:AST-|ROF_IT_)?(\d+)$/i);
                    if (match) {
                        nextNumber = Math.max(
                            nextNumber,
                            parseInt(match[1], 10) + 1
                        );
                    }
                });

                const assetId =
                    `AST-${String(nextNumber).padStart(4, "0")}`;


                res.json({

                    success: true,

                    asset_id:
                        assetId

                });

            }
        );

    }
);


// ============================================================
// GET SINGLE ASSET
// ============================================================

router.get(
    "/:assetId",
    (req, res) => {

        const assetId =
            req.params.assetId;


        const query = `

            SELECT

                a.*,

                (
                    SELECT employee_name
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_to,

                (
                    SELECT employee_id
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_employee_id,

                (
                    SELECT employee_email
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_employee_email,

                (
                    SELECT employee_mobile
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_employee_mobile,

                (
                    SELECT COALESCE(NULLIF(designation,''), employee_designation, '')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_designation,

                (
                    SELECT COALESCE(NULLIF(department,''), employee_department, '')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_department,

                (
                    SELECT COALESCE(NULLIF(location,''), employee_location, '')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_location,

                (
                    SELECT assignment_date
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_date,

                (
                    SELECT expected_return_date
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_expected_return_date,

                (
                    SELECT COALESCE(issued_by,'')
                    FROM asset_assignments
                    WHERE asset_id = a.asset_id
                      AND (
                          (assignment_status = 'Active' AND returned_date IS NULL)
                          OR (status = 'Assigned' AND returned_date IS NULL)
                      )
                    ORDER BY CASE WHEN assignment_status = 'Active' THEN 0 ELSE 1 END, id DESC
                    LIMIT 1
                ) AS assigned_issued_by

            FROM assets a

            WHERE
                a.asset_id = ?

            LIMIT 1

        `;


        db.get(
            query,
            [assetId],
            (error, asset) => {

                if (error) {

                    console.error(
                        "Error fetching asset:",
                        error.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to fetch asset."

                    });

                }


                if (!asset) {

                    return res.status(404).json({

                        success: false,

                        message:
                            "Asset not found."

                    });

                }


                res.json({

                    success: true,

                    asset: asset

                });

            }
        );

    }
);


// ============================================================
// ADD NEW ASSET
// ============================================================

router.post(
    "/",
    (req, res) => {

        const {

            asset_type,
            brand,
            model,
            serial_number,
            condition,
            purchase_date,
            purchase_cost,
            vendor,
            warranty_expiry,
            location,
            department,
            remarks

        } = req.body;


        // ----------------------------------------------------
        // REQUIRED FIELDS
        // ----------------------------------------------------

        if (
            !asset_type ||
            !brand ||
            !serial_number ||
            !condition ||
            !location
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required fields."

            });

        }


        // ----------------------------------------------------
        // DUPLICATE SERIAL NUMBER
        // ----------------------------------------------------

        const duplicateQuery = `

            SELECT id

            FROM assets

            WHERE serial_number = ?

            LIMIT 1

        `;


        db.get(
            duplicateQuery,
            [serial_number],
            (duplicateError, existingAsset) => {

                if (duplicateError) {

                    console.error(
                        "Duplicate serial check error:",
                        duplicateError.message
                    );


                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to check Serial Number."

                    });

                }


                if (existingAsset) {

                    return res.status(409).json({

                        success: false,

                        message:
                            "This Serial Number already exists."

                    });

                }


                // ------------------------------------------------
                // GENERATE ASSET ID
                // ------------------------------------------------

                const idQuery = `

                    SELECT asset_id

                    FROM assets

                    ORDER BY id DESC

                    LIMIT 1

                `;


                db.get(
                    idQuery,
                    [],
                    (idError, row) => {

                        if (idError) {

                            console.error(
                                "Asset ID error:",
                                idError.message
                            );


                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to generate Asset ID."

                            });

                        }


                        let nextNumber =
                            1;


                        if (
                            row &&
                            row.asset_id
                        ) {

                            const match =
                                row.asset_id.match(
                                    /(\d+)$/
                                );


                            if (match) {

                                nextNumber =
                                    parseInt(
                                        match[1],
                                        10
                                    ) + 1;

                            }

                        }


                        const assetId =
                            `AST-${String(nextNumber).padStart(4, "0")}`;


                        // ------------------------------------------------
                        // INSERT
                        // ------------------------------------------------

                        const insertQuery = `

                            INSERT INTO assets (

                                asset_id,
                                asset_type,
                                brand,
                                model,
                                serial_number,
                                purchase_date,
                                purchase_cost,
                                vendor,
                                warranty_expiry,
                                department,
                                location,
                                status,
                                condition,
                                remarks

                            )

                            VALUES (
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?,
                                ?
                            )

                        `;


                        const values = [

                            assetId,

                            asset_type,

                            brand,

                            model || "",

                            serial_number,

                            purchase_date || "",

                            Number(
                                purchase_cost
                            ) || 0,

                            vendor || "",

                            warranty_expiry || "",

                            department || "",

                            location,

                            "Available",

                            condition,

                            remarks || ""

                        ];


                        db.run(
                            insertQuery,
                            values,
                            function (
                                insertError
                            ) {

                                if (
                                    insertError
                                ) {

                                    console.error(
                                        "Asset insert error:",
                                        insertError.message
                                    );


                                    return res.status(500).json({

                                        success: false,

                                        message:
                                            "Unable to save asset."

                                    });

                                }


                                // ------------------------------------------------
                                // ACTIVITY HISTORY
                                // ------------------------------------------------

                                const activityQuery = `

                                    INSERT INTO activity_history (

                                        asset_id,
                                        activity_type,
                                        description

                                    )

                                    VALUES (?, ?, ?)

                                `;


                                db.run(
                                    activityQuery,
                                    [

                                        assetId,

                                        "Asset Added",

                                        `${assetId} - ${brand} ${model || ""} added`

                                    ],
                                    (
                                        activityError
                                    ) => {

                                        if (
                                            activityError
                                        ) {

                                            console.error(
                                                "Activity history error:",
                                                activityError.message
                                            );

                                        }


                                        res.json({

                                            success: true,

                                            message:
                                                "Asset added successfully.",

                                            asset_id:
                                                assetId

                                        });

                                    }
                                );

                            }
                        );

                    }
                );

            }
        );

    }
);


// ============================================================
// SEND ASSET FOR REPAIR
// ============================================================

router.post("/repair/start", (req, res) => {
    const { asset_id, problem, sent_to } = req.body || {};
    if (!asset_id || !String(problem || "").trim()) {
        return res.status(400).json({ success: false, message: "Asset ID and repair issue are required." });
    }

    db.get("SELECT * FROM assets WHERE asset_id=? LIMIT 1", [asset_id], (error, asset) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to find asset." });
        if (!asset) return res.status(404).json({ success: false, message: "Asset not found." });
        if (asset.status !== "Available") {
            return res.status(409).json({ success: false, message: `Asset is currently ${asset.status}.` });
        }

        const date = new Date().toISOString().split("T")[0];
        db.run(
            "UPDATE assets SET status='Under Repair' WHERE asset_id=?",
            [asset_id],
            updateError => {
                if (updateError) return res.status(500).json({ success: false, message: "Unable to mark asset under repair." });

                db.run(
                    `INSERT INTO repair_history
                        (asset_id, repair_date, problem, sent_to, repair_status)
                     VALUES (?, ?, ?, ?, 'Under Repair')`,
                    [asset_id, date, String(problem).trim(), String(sent_to || "").trim()],
                    historyError => {
                        if (historyError) console.error("Repair history insert error:", historyError.message);
                        db.run(
                            `INSERT INTO activity_history (asset_id, activity_type, description)
                             VALUES (?, ?, ?)`,
                            [asset_id, "Asset Sent for Repair", `${asset_id} sent for repair`],
                            () => res.json({ success: true, message: "Asset marked as Under Repair." })
                        );
                    }
                );
            }
        );
    });
});


// ============================================================
// RETIRE ASSET
// ============================================================

router.post("/retire", (req, res) => {
    const { asset_id, remarks } = req.body || {};
    if (!asset_id) return res.status(400).json({ success: false, message: "Asset ID is required." });

    db.get("SELECT * FROM assets WHERE asset_id=? LIMIT 1", [asset_id], (error, asset) => {
        if (error) return res.status(500).json({ success: false, message: "Unable to find asset." });
        if (!asset) return res.status(404).json({ success: false, message: "Asset not found." });
        if (asset.status !== "Available") {
            return res.status(409).json({ success: false, message: `Asset is currently ${asset.status}.` });
        }

        db.run(
            "UPDATE assets SET status='Retired', remarks=? WHERE asset_id=?",
            [String(remarks || "").trim(), asset_id],
            updateError => {
                if (updateError) return res.status(500).json({ success: false, message: "Unable to retire asset." });
                db.run(
                    `INSERT INTO activity_history (asset_id, activity_type, description)
                     VALUES (?, ?, ?)`,
                    [asset_id, "Asset Retired", `${asset_id} retired`],
                    () => res.json({ success: true, message: "Asset retired successfully." })
                );
            }
        );
    });
});


// ============================================================
// RECEIVE ASSET AFTER REPAIR
// ============================================================

router.post("/repair/complete", (req, res) => {
    const { asset_id, condition, remarks } = req.body || {};
    if (!asset_id || !condition) return res.status(400).json({ success: false, message: "Asset ID and condition are required." });

    db.get("SELECT * FROM assets WHERE asset_id = ? LIMIT 1", [asset_id], (err, asset) => {
        if (err) return res.status(500).json({ success: false, message: "Unable to find asset." });
        if (!asset) return res.status(404).json({ success: false, message: "Asset not found." });
        if (asset.status !== "Under Repair") return res.status(409).json({ success: false, message: `Asset is currently ${asset.status}.` });

        const today = new Date().toISOString().split("T")[0];
        db.run("UPDATE assets SET status='Available', condition=?, remarks=? WHERE asset_id=?", [condition, remarks || asset.remarks || "", asset_id], function (updateErr) {
            if (updateErr) return res.status(500).json({ success: false, message: "Unable to update repaired asset." });
            db.run(`INSERT INTO repair_history (asset_id, repair_date, repair_status, received_date, condition_after, remarks) VALUES (?, ?, 'Completed', ?, ?, ?)`, [asset_id, today, today, condition, remarks || ""], () => { });
            db.run(`INSERT INTO activity_history (asset_id, activity_type, description) VALUES (?, ?, ?)`, [asset_id, "Repair Completed", `${asset_id} received after repair and marked Available`], () => { });
            res.json({ success: true, message: "Repair completed. Asset is now Available." });
        });
    });
});

// ============================================================
// IMPORT ASSETS / ASSIGNMENT HISTORY / REPAIR HISTORY
// ============================================================

router.post(
    "/import",
    upload.single("file"),
    (req, res) => {

        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: "Please select an Excel or CSV file."
            });
        }

        try {
            const workbook = XLSX.read(req.file.buffer, {
                type: "buffer",
                cellDates: true
            });

            if (!workbook.SheetNames.length) {
                return res.status(400).json({
                    success: false,
                    message: "The uploaded file has no worksheet."
                });
            }

            const cleanKey = key => String(key ?? "")
                .trim()
                .toLowerCase()
                .replace(/[()]/g, "")
                .replace(/[\/\\-]+/g, "_")
                .replace(/\s+/g, "_")
                .replace(/_+/g, "_")
                .replace(/^_|_$/g, "");

            const findHeaderRow = ws => {
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        for (let i = 0; i < Math.min(rows.length, 20); i++) {
            const keys = rows[i].map(c => cleanKey(c));
            if (keys.includes("asset_id") || keys.includes("serial_number") || keys.includes("asset_code")) return i;
        }
        return 0;
    };

    const normalizeRows = sheetName =>
                XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: "", range: findHeaderRow(workbook.Sheets[sheetName]) }).map(row => Object.fromEntries(
                    Object.entries(row).map(([k, v]) => [cleanKey(k), v])
                ));

            const valueOf = (row, names) => {
                for (const name of names) {
                    const key = cleanKey(name);
                    if (row[key] !== undefined && String(row[key] ?? "").trim() !== "") {
                        return row[key];
                    }
                }
                return "";
            };

            const text = (row, names) => {
                const value = valueOf(row, names);
                if (value instanceof Date) {
                    return value.toISOString().split("T")[0];
                }
                return String(value ?? "").trim();
            };

            const num = (row, names) => {
                const value = Number(valueOf(row, names));
                return Number.isFinite(value) ? value : 0;
            };

            const today = () => new Date().toISOString().split("T")[0];

            const findSheet = (aliases, fallback = null) => {
                const found = workbook.SheetNames.find(sheetName => {
                    const normalized = cleanKey(sheetName);
                    return aliases.includes(normalized) || aliases.includes(String(sheetName).trim().toLowerCase());
                });
                return found || fallback;
            };

            const assetSheet = findSheet(
                ["assets", "all_assets", "asset_data", "asset_register"],
                workbook.SheetNames[0]
            );
            const historySheet = findSheet([
                "assignment_history",
                "assignmenthistory",
                "history"
            ]);
            const repairSheet = findSheet([
                "repair_history",
                "repairhistory"
            ]);

            const assetRows = normalizeRows(assetSheet);
            const historyRows = historySheet ? normalizeRows(historySheet) : [];
            const repairRows = repairSheet ? normalizeRows(repairSheet) : [];

            if (!assetRows.length) {
                return res.status(400).json({
                    success: false,
                    message: "The asset worksheet is empty."
                });
            }

            db.serialize(() => {
                db.run("BEGIN TRANSACTION", beginError => {
                    if (beginError) {
                        return res.status(500).json({
                            success: false,
                            message: "Unable to start import."
                        });
                    }

                    let imported = 0;
                    let skipped = 0;
                    let invalid = 0;
                    const invalidRows = [];
                    const skippedRows = [];
                    const historyAssetIds = new Set();

                    const rollback = message => {
                        db.run("ROLLBACK", () => res.status(500).json({
                            success: false,
                            message
                        }));
                    };

                    const getNextNumber = callback => {
                        db.all("SELECT asset_id FROM assets", [], (error, rows) => {
                            if (error) return callback(error);
                            let max = 0;
                            (rows || []).forEach(row => {
                                const match = String(row.asset_id || "").match(/^(?:AST-|ROF_IT_)?(\d+)$/i);
                                if (match) max = Math.max(max, Number(match[1]));
                            });
                            callback(null, max + 1);
                        });
                    };

                    getNextNumber((numberError, nextStart) => {
                        if (numberError) return rollback("Unable to generate Asset IDs.");

                        let nextNumber = nextStart;

                        const finish = () => {
                            db.run("COMMIT", commitError => {
                                if (commitError) return rollback("Unable to complete import.");

                                const user = req.session?.user || {};
                                db.run(
                                    `INSERT INTO import_history
                                     (user_id, username, file_name, total_rows, imported_rows, skipped_rows, invalid_rows)
                                     VALUES (?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        user.id || null,
                                        user.username || user.name || "",
                                        req.file.originalname || "",
                                        assetRows.length + historyRows.length + repairRows.length,
                                        imported,
                                        skipped,
                                        invalid
                                    ],
                                    () => {
                                        return res.json({
                                            success: true,
                                            message: "Import completed.",
                                            summary: {
                                                total: assetRows.length + historyRows.length + repairRows.length,
                                                imported,
                                                skipped,
                                                invalid
                                            },
                                            invalidRows,
                                            skippedRows
                                        });
                                    }
                                );
                            });
                        };

                        // ----------------------------------------------------
                        // Save/update current assignment using both legacy and
                        // current column names. This keeps old DBs compatible.
                        // ----------------------------------------------------
                        const saveCurrentAssignment = (assetId, row, status, callback) => {
                            if (status !== "Assigned") return callback();

                            const employeeName = text(row, ["employee_name", "assigned_to", "employee"]);
                            // Current assignment may be supplied in the separate
                            // Assignment History sheet. Do not abort the entire import
                            // just because the Assets sheet has no assignee columns.
                            if (!employeeName) {
                                return callback();
                            }

                            const employeeId = text(row, ["employee_id", "employee_code", "employee_id_code"]) || "N/A";
                            const employeeEmail = text(row, ["employee_email", "email"]);
                            const employeeMobile = text(row, ["employee_mobile", "mobile"]);
                            const department = text(row, ["department", "employee_department"]);
                            const designation = text(row, ["designation", "employee_designation"]);
                            const location = text(row, ["location", "employee_location"]);
                            const assignmentDate = text(row, ["assignment_date", "issue_date", "issued_date"]) || today();
                            const expectedReturn = text(row, ["expected_return_date", "expected_return"]);
                            const handover = text(row, ["condition_out", "handover_condition", "asset_condition_at_issuance", "condition"]) || "Good";
                            const remarks = text(row, ["assignment_remarks", "assignment_notes", "remarks", "notes"]);
                            const issuedBy = text(row, ["issued_by", "issued_by_name"]);

                            db.get(
                                `SELECT id FROM asset_assignments
                                 WHERE asset_id = ?
                                   AND (assignment_status = 'Active' OR status = 'Assigned')
                                 ORDER BY id DESC LIMIT 1`,
                                [assetId],
                                (findError, current) => {
                                    if (findError) return callback(findError);

                                    const params = [
                                        employeeId,
                                        employeeName,
                                        employeeEmail,
                                        employeeMobile,
                                        department,
                                        designation,
                                        location,
                                        assignmentDate,
                                        expectedReturn,
                                        handover,
                                        remarks,
                                        issuedBy
                                    ];

                                    if (current) {
                                        return db.run(
                                            `UPDATE asset_assignments SET
                                                employee_id = ?,
                                                employee_name = ?,
                                                employee_email = ?,
                                                employee_mobile = ?,
                                                employee_department = ?,
                                                employee_designation = ?,
                                                employee_location = ?,
                                                department = ?,
                                                designation = ?,
                                                location = ?,
                                                assignment_date = ?,
                                                expected_return_date = ?,
                                                handover_condition = ?,
                                                remarks = ?,
                                                assignment_remarks = ?,
                                                assignment_status = 'Active',
                                                status = 'Assigned',
                                                issued_by = ?
                                             WHERE id = ?`,
                                            [
                                                employeeId, employeeName, employeeEmail, employeeMobile,
                                                department, designation, location,
                                                department, designation, location,
                                                assignmentDate, expectedReturn, handover,
                                                remarks, remarks, issuedBy, current.id
                                            ],
                                            callback
                                        );
                                    }

                                    db.run(
                                        `INSERT INTO asset_assignments (
                                            asset_id, employee_id, employee_name, employee_email, employee_mobile,
                                            employee_department, employee_designation, employee_location,
                                            department, designation, location,
                                            assignment_date, expected_return_date, handover_condition,
                                            remarks, assignment_remarks, assignment_status, status, issued_by
                                         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Active', 'Assigned', ?)`,
                                        [
                                            assetId, employeeId, employeeName, employeeEmail, employeeMobile,
                                            department, designation, location,
                                            department, designation, location,
                                            assignmentDate, expectedReturn, handover,
                                            remarks, remarks, issuedBy
                                        ],
                                        callback
                                    );
                                }
                            );
                        };

                        const processAssets = index => {
                            if (index >= assetRows.length) return processHistory(0);

                            const row = assetRows[index];
                            const suppliedAssetId = text(row, ["asset_id", "asset_code", "asset_no", "asset_number"]);
                            const assetId = suppliedAssetId || `AST-${String(nextNumber++).padStart(4, "0")}`;

                            // Check whether Asset ID already exists.
                            // Existing Asset ID = UPDATE
                            // New Asset ID = CREATE NEW ASSET
                            db.get(
                                "SELECT * FROM assets WHERE asset_id = ? LIMIT 1",
                                [assetId],
                                (lookupError, existing) => {
                                    if (lookupError) {
                                        return rollback("Unable to validate Asset ID.");
                                    }

                                    const assetType = text(row, ["asset_type", "type"]);
                                    const brand = text(row, ["brand"]);
                                    const model = text(row, ["model"]);
                                    const serial = text(row, ["serial_number", "serial_no", "serial"]);

                                    if (!assetType || !brand || !serial) {
                                        invalid++;
                                        invalidRows.push({
                                            row: index + 2,
                                            sheet: "Assets",
                                            asset_id: assetId,
                                            reason: "Missing Asset Type, Brand or Serial Number."
                                        });
                                        return processAssets(index + 1);
                                    }

                                    db.get(
                                        "SELECT asset_id FROM assets WHERE serial_number = ? LIMIT 1",
                                        [serial],
                                        (serialError, serialOwner) => {
                                            if (serialError) return rollback("Unable to validate Serial Number.");
                                            if (serialOwner && serialOwner.asset_id !== assetId) {
                                                invalid++;
                                                invalidRows.push({
                                                    row: index + 2,
                                                    sheet: "Assets",
                                                    asset_id: assetId,
                                                    reason: `Serial Number already belongs to ${serialOwner.asset_id}.`
                                                });
                                                return processAssets(index + 1);
                                            }

                                            const rawStatus = text(row, ["status", "asset_status"]).toLowerCase();
                                            const statusMap = {
                                                available: "Available",
                                                assigned: "Assigned",
                                                active: "Assigned",
                                                issued: "Assigned",
                                                "under repair": "Under Repair",
                                                repair: "Under Repair",
                                                repaired: "Available",
                                                retired: "Retired"
                                            };
                                            const status = statusMap[rawStatus] || "Available";

                                            const values = [
                                                assetType,
                                                brand,
                                                model,
                                                serial,
                                                text(row, ["purchase_date"]),
                                                num(row, ["purchase_cost"]),
                                                text(row, ["vendor"]),
                                                text(row, ["warranty_expiry"]),
                                                text(row, ["department"]),
                                                text(row, ["location"]) || "Head Office",
                                                status,
                                                text(row, ["condition", "asset_condition"]) || "New",
                                                text(row, ["remarks", "notes"])
                                            ];

                                            const saveAsset = callback => {
                                                if (existing) {
                                                    db.run(
                                                        `UPDATE assets SET
                                                            asset_type=?, brand=?, model=?, serial_number=?,
                                                            purchase_date=?, purchase_cost=?, vendor=?, warranty_expiry=?,
                                                            department=?, location=?, status=?, condition=?, remarks=?
                                                         WHERE asset_id=?`,
                                                        [...values, assetId],
                                                        callback
                                                    );
                                                } else {
                                                    db.run(
                                                        `INSERT INTO assets
                                                            (asset_id, asset_type, brand, model, serial_number,
                                                             purchase_date, purchase_cost, vendor, warranty_expiry,
                                                             department, location, status, condition, remarks)
                                                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                                        [assetId, ...values],
                                                        callback
                                                    );
                                                }
                                            };

                                            saveAsset(assetError => {
                                                if (assetError) return rollback("Unable to save imported asset: " + assetError.message);

                                                saveCurrentAssignment(assetId, row, status, assignmentError => {
                                                    if (assignmentError) return rollback("Unable to save imported assignment: " + assignmentError.message);
                                                    imported++;
                                                    processAssets(index + 1);
                                                });
                                            });
                                        }
                                    );
                                }
                            );
                        };

                        const processHistory = index => {
                            if (index >= historyRows.length) {
                                return syncHistoryAssetStatuses(historyAssetIds, 0, syncError => {
                                    if (syncError) return rollback("Unable to synchronize imported assignment status.");
                                    processRepairs(0);
                                });
                            }

                            const row = historyRows[index];
                            const assetId = text(row, ["asset_id", "asset_code"]);
                            const employeeName = text(row, ["employee_name", "assigned_to", "employee"]);
                            const assignmentDate = text(row, ["assignment_date", "issue_date", "issued_date"]);

                            if (!assetId || !employeeName || !assignmentDate) {
                                skipped++;
                                skippedRows.push({
                                    row: index + 2,
                                    sheet: "Assignment History",
                                    reason: "Missing Asset ID, Employee Name or Assignment Date."
                                });
                                return processHistory(index + 1);
                            }

                            db.get("SELECT asset_id FROM assets WHERE asset_id=?", [assetId], (assetError, asset) => {
                                if (assetError) return rollback("Unable to validate assignment history.");
                                if (!asset) {
                                    invalid++;
                                    invalidRows.push({
                                        row: index + 2,
                                        sheet: "Assignment History",
                                        asset_id: assetId,
                                        reason: "Asset ID does not exist in the system."
                                    });
                                    return processHistory(index + 1);
                                }

                                historyAssetIds.add(assetId);

                                const employeeId = text(row, ["employee_id", "employee_code"]) || "N/A";
                                const returnedDate = text(row, ["returned_date", "return_date"]);
                                const rawStatus = text(row, ["status", "assignment_status"]).toLowerCase();
                                const status = returnedDate || ["returned", "closed"].includes(rawStatus)
                                    ? "Returned"
                                    : "Assigned";

                                db.get(
                                    `SELECT id FROM asset_assignments
                                     WHERE asset_id=? AND employee_id=? AND assignment_date=?
                                     LIMIT 1`,
                                    [assetId, employeeId, assignmentDate],
                                    (duplicateError, duplicate) => {
                                        if (duplicateError) return rollback("Unable to validate assignment history.");
                                        if (duplicate) {
                                            skipped++;
                                            skippedRows.push({
                                                row: index + 2,
                                                sheet: "Assignment History",
                                                reason: "Duplicate assignment history record already exists."
                                            });
                                            return processHistory(index + 1);
                                        }

                                        db.run(
                                            `INSERT INTO asset_assignments (
                                                asset_id, employee_id, employee_name, employee_email, employee_mobile,
                                                employee_department, employee_designation, employee_location,
                                                department, designation, location,
                                                assignment_date, expected_return_date, handover_condition,
                                                remarks, assignment_remarks, returned_date, return_condition,
                                                return_remarks, assignment_status, status, issued_by
                                             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                            [
                                                assetId,
                                                employeeId,
                                                employeeName,
                                                text(row, ["employee_email", "email"]),
                                                text(row, ["employee_mobile", "mobile"]),
                                                text(row, ["employee_department", "department"]),
                                                text(row, ["employee_designation", "designation"]),
                                                text(row, ["employee_location", "location"]),
                                                text(row, ["department", "employee_department"]),
                                                text(row, ["designation", "employee_designation"]),
                                                text(row, ["location", "employee_location"]),
                                                assignmentDate,
                                                text(row, ["expected_return_date", "expected_return"]),
                                                text(row, ["condition_out", "handover_condition", "condition"]) || "Good",
                                                text(row, ["remarks", "assignment_remarks"]),
                                                text(row, ["assignment_remarks", "remarks"]),
                                                returnedDate || null,
                                                text(row, ["condition_in", "return_condition"]),
                                                text(row, ["return_remarks"]),
                                                status === "Assigned" ? "Active" : "Returned",
                                                status === "Assigned" ? "Assigned" : "Returned",
                                                text(row, ["issued_by", "issued_by_name"])
                                            ],
                                            error => {
                                                if (error) return rollback("Unable to import assignment history: " + error.message);
                                                imported++;
                                                processHistory(index + 1);
                                            }
                                        );
                                    }
                                );
                            });
                        };

                        const syncHistoryAssetStatuses = (assetIds, index, callback) => {
                            const ids = Array.from(assetIds);
                            if (index >= ids.length) return callback();

                            const assetId = ids[index];
                            db.get(
                                `SELECT status FROM assets WHERE asset_id=? LIMIT 1`,
                                [assetId],
                                (assetError, assetRow) => {
                                    if (assetError) return callback(assetError);
                                    if (!assetRow || ["Under Repair", "Retired"].includes(assetRow.status)) {
                                        return syncHistoryAssetStatuses(assetIds, index + 1, callback);
                                    }

                                    db.get(
                                        `SELECT id FROM asset_assignments
                                         WHERE asset_id=?
                                           AND (assignment_status='Active' OR (status='Assigned' AND returned_date IS NULL))
                                         ORDER BY CASE WHEN assignment_status='Active' THEN 0 ELSE 1 END, id DESC
                                         LIMIT 1`,
                                        [assetId],
                                        (assignmentError, current) => {
                                            if (assignmentError) return callback(assignmentError);
                                            const nextStatus = current ? "Assigned" : "Available";
                                            db.run(
                                                `UPDATE assets SET status=? WHERE asset_id=?`,
                                                [nextStatus, assetId],
                                                updateError => {
                                                    if (updateError) return callback(updateError);
                                                    syncHistoryAssetStatuses(assetIds, index + 1, callback);
                                                }
                                            );
                                        }
                                    );
                                }
                            );
                        };

                        const processRepairs = index => {
                            if (index >= repairRows.length) return finish();

                            const row = repairRows[index];
                            const assetId = text(row, ["asset_id", "asset_code"]);

                            if (!assetId) {
                                skipped++;
                                skippedRows.push({
                                    row: index + 2,
                                    sheet: "Repair History",
                                    reason: "Missing Asset ID."
                                });
                                return processRepairs(index + 1);
                            }

                            db.get("SELECT asset_id FROM assets WHERE asset_id=?", [assetId], (assetError, asset) => {
                                if (assetError) return rollback("Unable to validate repair history.");
                                if (!asset) {
                                    invalid++;
                                    invalidRows.push({
                                        row: index + 2,
                                        sheet: "Repair History",
                                        asset_id: assetId,
                                        reason: "Asset ID does not exist in the system."
                                    });
                                    return processRepairs(index + 1);
                                }

                                db.run(
                                    `INSERT INTO repair_history
                                        (asset_id, repair_date, problem, sent_to, repair_status,
                                         received_date, repair_cost, condition_after, remarks)
                                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                                    [
                                        assetId,
                                        text(row, ["repair_date", "date"]) || today(),
                                        text(row, ["problem", "issue"]),
                                        text(row, ["sent_to", "vendor", "repair_vendor"]),
                                        text(row, ["repair_status", "status"]),
                                        text(row, ["received_date"]),
                                        num(row, ["repair_cost", "cost"]),
                                        text(row, ["condition_after", "condition"]),
                                        text(row, ["remarks", "notes"])
                                    ],
                                    error => {
                                        if (error) return rollback("Unable to import repair history: " + error.message);
                                        imported++;
                                        processRepairs(index + 1);
                                    }
                                );
                            });
                        };

                        processAssets(0);
                    });
                });
            });
        } catch (error) {
            console.error("Excel import error:", error.message);
            return res.status(400).json({
                success: false,
                message: "Unable to read the uploaded Excel/CSV file."
            });
        }
    }
);


// ============================================================
// MULTER ERROR HANDLER
// ============================================================

router.use(
    (
        error,
        req,
        res,
        next
    ) => {

        if (
            error instanceof
            multer.MulterError
        ) {

            if (
                error.code ===
                "LIMIT_FILE_SIZE"
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "File is too large. Maximum allowed size is 10 MB."

                });

            }


            return res.status(400).json({

                success: false,

                message:
                    "File upload error: " +
                    error.message

            });

        }


        if (error) {

            console.error(
                "Route error:",
                error.message
            );


            return res.status(500).json({

                success: false,

                message:
                    "Something went wrong."

            });

        }


        next();

    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;