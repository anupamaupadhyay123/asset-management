// Final dashboard: Utilization, Top Brands, Warranty Alerts, Status donut, Asset Types columns
(function () {
    "use strict";

    var STATUS = [
        { label: "Available", color: "#16a34a" },
        { label: "Assigned", color: "#2563eb" },
        { label: "Under Repair", color: "#f59e0b" },
        { label: "Retired", color: "#94a3b8" }
    ];

    function pick(o, keys) {
        for (var i = 0; i < keys.length; i++) {
            var v = o[keys[i]];
            if (v !== undefined && v !== null && String(v).trim() !== "") return String(v).trim();
        }
        return "";
    }

    function esc(t) {
        return String(t).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function parseDate(v) {
        if (!v) return null;
        var s = String(v).trim();
        var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        var d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    function card(icon, title, sub, body) {
        return '<div class="df-card"><div class="df-title"><div class="df-ico">' + icon +
            '</div><div><h3>' + title + '</h3><p>' + sub + '</p></div></div>' + body + '</div>';
    }

    function countStatus(list, label) {
        return list.filter(function (a) {
            return String(a.status || "").toLowerCase() === label.toLowerCase();
        }).length;
    }

    function utilization(list) {
    if (!document.getElementById("dcvStyle")) {
        var st = document.createElement("style");
        st.id = "dcvStyle";
        st.textContent =
            ".dcv-head{display:flex;align-items:baseline;gap:8px;margin-bottom:4px}" +
            ".dcv-head strong{font-size:28px;color:#0b1437}" +
            ".dcv-head span{font-size:13px;color:#64748b}" +
            ".dcv-key{display:flex;gap:16px;font-size:12px;color:#334155;margin-bottom:4px}" +
            ".dcv-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}" +
            ".dcv-svg{width:100%;height:auto;display:block}" +
            ".dcv-dot{cursor:pointer;transition:r .15s}" +
            ".dcv-dot:hover{r:6}" +
            ".dcv-lbl{font-size:10px;fill:#64748b}";
        document.head.appendChild(st);
    }

    var years = {}; (function(){ var cy = new Date().getFullYear(); for (var i = 2; i >= 0; i--) { years[cy - i] = { as: 0, av: 0 }; } })();
    list.forEach(function (a) {
        var d = parseDate(pick(a, ["purchase_date", "purchase_year"]));
        if (!d) return;
        var y = d.getFullYear();
        if (!years[y]) years[y] = { as: 0, av: 0 };
        var s = String(a.status || "").toLowerCase();
        if (s === "assigned") years[y].as++;
        else if (s === "available") years[y].av++;
    });

    var ys = Object.keys(years).sort();
    if (!ys.length) return '<div class="df-empty">Purchase dates not found in assets</div>';

    var total = list.length;
    var assigned = countStatus(list, "Assigned");
    var pct = total ? Math.round((assigned / total) * 100) : 0;

    var W = 300, H = 170, L = 28, R = 14, T = 14, B = 26;
    var baseY = H - B;
    var max = 1;
    ys.forEach(function (y) { max = Math.max(max, years[y].as, years[y].av); });
    var step = Math.max(1, Math.ceil(max / 4));
    var top = step * 4;

    function px(i) { return ys.length === 1 ? L + (W - L - R) / 2 : L + i * (W - L - R) / (ys.length - 1); }
    function py(v) { return T + (H - T - B) * (1 - v / top); }

    function curve(pts) {
        if (pts.length < 2) return "";
        var d = "M" + pts[0][0] + " " + pts[0][1];
        for (var i = 0; i < pts.length - 1; i++) {
            var p0 = pts[i - 1] || pts[i], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2] || p2;
            var c1x = p1[0] + (p2[0] - p0[0]) / 6;
            var c1y = Math.min(baseY, p1[1] + (p2[1] - p0[1]) / 6);
            var c2x = p2[0] - (p3[0] - p1[0]) / 6;
            var c2y = Math.min(baseY, p2[1] - (p3[1] - p1[1]) / 6);
            d += " C" + c1x + " " + c1y + "," + c2x + " " + c2y + "," + p2[0] + " " + p2[1];
        }
        return d;
    }

    function series(key, color, grad, status) {
        var pts = ys.map(function (y, i) { return [px(i), py(years[y][key])]; });
        var out = "";
        if (pts.length > 1) {
            var line = curve(pts);
            out += '<path d="' + line + ' L' + pts[pts.length - 1][0] + " " + baseY + " L" + pts[0][0] + " " + baseY + ' Z" fill="url(#' + grad + ')"/>';
            out += '<path d="' + line + '" fill="none" stroke="' + color + '" stroke-width="2.5" stroke-linecap="round"/>';
        }
        ys.forEach(function (y, i) {
            out += '<a href="assets.html?year=' + y + '&status=' + status + '"><circle class="dcv-dot" cx="' + pts[i][0] + '" cy="' + pts[i][1] +
                '" r="4" fill="#fff" stroke="' + color + '" stroke-width="2"><title>' + y + ' ' + status + ': ' + years[y][key] + '</title></circle></a>';
        });
        return out;
    }

    var svg = '<svg class="dcv-svg" viewBox="0 0 ' + W + ' ' + H + '">' +
        '<defs>' +
        '<linearGradient id="dcvA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2563eb" stop-opacity=".35"/><stop offset="1" stop-color="#2563eb" stop-opacity="0"/></linearGradient>' +
        '<linearGradient id="dcvB" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16a34a" stop-opacity=".30"/><stop offset="1" stop-color="#16a34a" stop-opacity="0"/></linearGradient>' +
        '</defs>';

    for (var g = 0; g <= 4; g++) {
        var gy = py(g * step);
        svg += '<line x1="' + L + '" y1="' + gy + '" x2="' + (W - R) + '" y2="' + gy + '" stroke="#e2e8f0" stroke-width="1"/>' +
            '<text class="dcv-lbl" x="' + (L - 6) + '" y="' + (gy + 3) + '" text-anchor="end">' + (g * step) + '</text>';
    }

    svg += series("av", "#16a34a", "dcvB", "Available");
    svg += series("as", "#2563eb", "dcvA", "Assigned");

    ys.forEach(function (y, i) {
        svg += '<text class="dcv-lbl" x="' + px(i) + '" y="' + (H - 8) + '" text-anchor="middle">' + y + '</text>';
    });
    svg += '</svg>';

    return '<div class="dcv-head"><strong>' + pct + '%</strong><span>in use (' + assigned + ' of ' + total + ' assets assigned)</span></div>' +
        '<div class="dcv-key"><span><i style="background:#2563eb"></i>Assigned</span><span><i style="background:#16a34a"></i>Available</span></div>' + svg;
}
function utilizationDept(list) {
    if (!document.getElementById("dhStyle")) {
        var st = document.createElement("style");
        st.id = "dhStyle";
        st.textContent =
            ".dh-head{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}" +
            ".dh-head strong{font-size:28px;color:#0b1437}" +
            ".dh-head span{font-size:13px;color:#64748b}" +
            ".dh-key{display:flex;gap:16px;font-size:12px;color:#334155;margin-bottom:12px}" +
            ".dh-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}" +
            ".dh-row{display:block;margin:12px 0;text-decoration:none;color:#334155;font-size:13px}" +
            ".dh-row:hover .dh-inner{filter:brightness(1.12)}" +
            ".dh-top{display:flex;justify-content:space-between;margin-bottom:5px}" +
            ".dh-track{height:14px;background:#e2e8f0;border-radius:99px;overflow:hidden}" +
            ".dh-inner{display:flex;height:100%;border-radius:99px;overflow:hidden;transition:filter .2s}" +
            ".dh-as{background:#2563eb}.dh-av{background:#16a34a}.dh-ot{background:#94a3b8}";
        document.head.appendChild(st);
    }

    var depts = {};
    list.forEach(function (a) {
        var d = pick(a, ["department", "location"]) || "Not specified";
        if (!depts[d]) depts[d] = { as: 0, av: 0, ot: 0, total: 0 };
        var s = String(a.status || "").toLowerCase();
        if (s === "assigned") depts[d].as++;
        else if (s === "available") depts[d].av++;
        else depts[d].ot++;
        depts[d].total++;
    });

    var rows = Object.keys(depts).map(function (k) { return { name: k, d: depts[k] }; })
        .sort(function (x, y) { return y.d.total - x.d.total; }).slice(0, 5);

    if (!rows.length) return '<div class="df-empty">No department data found</div>';

    var total = list.length;
    var assigned = countStatus(list, "Assigned");
    var pct = total ? Math.round((assigned / total) * 100) : 0;
    var max = rows[0].d.total;

    var html = '<div class="dh-head"><strong>' + pct + '%</strong><span>in use (' + assigned + ' of ' + total + ' assets assigned)</span></div>' +
        '<div class="dh-key"><span><i style="background:#2563eb"></i>Assigned</span>' +
        '<span><i style="background:#16a34a"></i>Available</span>' +
        '<span><i style="background:#94a3b8"></i>Other</span></div>';

    rows.forEach(function (r) {
        var d = r.d;
        var width = Math.round((d.total / max) * 100);
        html += '<a class="dh-row" href="assets.html?dept=' + encodeURIComponent(r.name) + '" title="' + esc(r.name) + '">' +
            '<div class="dh-top"><span>' + esc(r.name) + '</span><b>' + d.total + '</b></div>' +
            '<div class="dh-track"><div class="dh-inner" style="width:' + width + '%">' +
            '<div class="dh-as" style="width:' + (d.as / d.total * 100) + '%"></div>' +
            '<div class="dh-av" style="width:' + (d.av / d.total * 100) + '%"></div>' +
            '<div class="dh-ot" style="width:' + (d.ot / d.total * 100) + '%"></div>' +
            '</div></div></a>';
    });

    return html;
}
function utilizationTypeBars(list) {
    if (!document.getElementById("duStyle")) {
        var st = document.createElement("style");
        st.id = "duStyle";
        st.textContent =
            ".du-head{display:flex;align-items:baseline;gap:8px;margin-bottom:6px}" +
            ".du-head strong{font-size:28px;color:#0b1437}" +
            ".du-head span{font-size:13px;color:#64748b}" +
            ".du-key{display:flex;gap:16px;font-size:12px;color:#334155;margin-bottom:8px}" +
            ".du-key i{display:inline-block;width:10px;height:10px;border-radius:3px;margin-right:5px}" +
            ".du-chart{display:flex;gap:16px;align-items:flex-end;padding-top:18px}" +
            ".du-grp{flex:1;display:flex;flex-direction:column;align-items:center}" +
            ".du-bars{height:120px;width:100%;display:flex;align-items:flex-end;justify-content:center;gap:6px;border-bottom:1px solid #cbd5e1}" +
            ".du-bar{position:relative;width:42%;max-width:30px;border-radius:5px 5px 0 0;transition:filter .2s;text-decoration:none}" +
            ".du-bar b{position:absolute;top:-16px;left:0;right:0;text-align:center;font-size:11px;color:#334155}" +
            ".du-bar:hover{filter:brightness(1.15)}" +
            ".du-bar.as{background:linear-gradient(180deg,#60a5fa,#2563eb)}" +
            ".du-bar.av{background:linear-gradient(180deg,#4ade80,#16a34a)}" +
            ".du-grp em{font-style:normal;font-size:12px;color:#334155;margin-top:6px}";
        document.head.appendChild(st);
    }

    var names = ["Laptop", "Desktop", "Printer", "Others"];
    var data = {};
    names.forEach(function (n) { data[n] = { as: 0, av: 0 }; });

    list.forEach(function (a) {
        var t = pick(a, ["asset_type", "type", "category"]).toLowerCase();
        var n = t.indexOf("laptop") !== -1 ? "Laptop" :
                t.indexOf("desktop") !== -1 ? "Desktop" :
                t.indexOf("printer") !== -1 ? "Printer" : "Others";
        var s = String(a.status || "").toLowerCase();
        if (s === "assigned") data[n].as++;
        else if (s === "available") data[n].av++;
    });

    var total = list.length;
    var assigned = countStatus(list, "Assigned");
    var pct = total ? Math.round((assigned / total) * 100) : 0;

    var max = 1;
    names.forEach(function (n) { max = Math.max(max, data[n].as, data[n].av); });

    var html = '<div class="du-head"><strong>' + pct + '%</strong><span>in use (' + assigned + ' of ' + total + ' assets assigned)</span></div>' +
        '<div class="du-key"><span><i style="background:#2563eb"></i>Assigned</span><span><i style="background:#16a34a"></i>Available</span></div>' +
        '<div class="du-chart">';

    names.forEach(function (n) {
        var hAs = data[n].as ? Math.max(4, Math.round((data[n].as / max) * 100)) : 0;
        var hAv = data[n].av ? Math.max(4, Math.round((data[n].av / max) * 100)) : 0;
        var base = n === "Others" ? "assets.html?" : "assets.html?type=" + n + "&";
        html += '<div class="du-grp"><div class="du-bars">' +
            '<a class="du-bar as" href="' + base + 'status=Assigned" style="height:' + hAs + '%" title="' + n + ' assigned: ' + data[n].as + '"><b>' + data[n].as + '</b></a>' +
            '<a class="du-bar av" href="' + base + 'status=Available" style="height:' + hAv + '%" title="' + n + ' available: ' + data[n].av + '"><b>' + data[n].av + '</b></a>' +
            '</div><em>' + n + '</em></div>';
    });

    return html + '</div>';
}
function utilizationOld(list) {
        var total = list.length;
        var assigned = countStatus(list, "Assigned");
        var pct = total ? Math.round((assigned / total) * 100) : 0;
        return '<div class="df-flex"><div class="df-ring" style="--p:' + pct + '"><div class="df-ring-in"><strong>' +
            pct + '%</strong><span>Assigned</span></div></div>' +
            '<div class="df-leg"><a href="assets.html?status=Assigned"><i style="background:#2563eb"></i>Assigned<b>' + assigned + '</b></a>' +
            '<div><i style="background:#cbd5e1"></i>Not assigned<b>' + (total - assigned) + '</b></div></div></div>' +
            '<div class="df-note">' + assigned + ' of ' + total + ' assets assigned</div>';
    }

    function topBrands(list) {
        var counts = {};
        list.forEach(function (a) {
            var b = pick(a, ["brand", "make", "manufacturer"]);
            if (b) counts[b] = (counts[b] || 0) + 1;
        });
        var rows = Object.keys(counts).map(function (k) { return { n: k, c: counts[k] }; })
            .sort(function (x, y) { return y.c - x.c; }).slice(0, 5);
        if (!rows.length) return '<div class="df-empty">No brand data found</div>';
        var max = rows[0].c;
        return rows.map(function (r) {
            return '<div class="df-brow"><div class="df-brow-top"><span>' + esc(r.n) + '</span><b>' + r.c + '</b></div>' +
                '<div class="df-track"><div class="df-fill" style="width:' + Math.round((r.c / max) * 100) + '%"></div></div></div>';
        }).join("");
    }

    function warranty(list) {
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var items = [];
        list.forEach(function (a) {
            var d = parseDate(pick(a, ["warranty_expiry", "warranty_expiry_date", "warranty_end", "warranty_end_date", "warranty"]));
            if (!d) return;
            var days = Math.ceil((d - today) / 86400000);
            if (days <= 90) items.push({ a: a, days: days });
        });
        if (!items.length) {
            return '<div class="df-bell">&#128276;</div><div class="df-note">No warranty alerts right now.</div>';
        }
        items.sort(function (x, y) { return x.days - y.days; });
        return items.slice(0, 5).map(function (i) {
            var name = pick(i.a, ["asset_id", "asset_code"]) + " " + pick(i.a, ["brand", "make"]) + " " + pick(i.a, ["model", "asset_type", "type"]);
            var badge = i.days < 0 ? '<span class="df-badge red">Expired</span>'
                : '<span class="df-badge amber">' + i.days + ' days left</span>';
            return '<div class="df-wrow"><span>' + esc(name.trim()) + '</span>' + badge + '</div>';
        }).join("");
    }

    function statusPanel(list) {
        var total = list.length;
        var items = STATUS.map(function (s) {
            return { label: s.label, color: s.color, value: countStatus(list, s.label) };
        });
        if (!total) return '<div class="df-empty">No assets yet</div>';

        var r = 44, C = 2 * Math.PI * r, off = 0;
        var svg = '<svg viewBox="0 0 120 120" class="df-donut"><circle cx="60" cy="60" r="' + r +
            '" fill="none" stroke="#e2e8f0" stroke-width="16"/>';
        items.forEach(function (it) {
            if (!it.value) return;
            var len = (it.value / total) * C;
            svg += '<a href="assets.html?status=' + encodeURIComponent(it.label) + '"><circle class="df-seg" cx="60" cy="60" r="' + r +
                '" fill="none" stroke="' + it.color + '" stroke-width="16" stroke-dasharray="' + len + ' ' + (C - len) +
                '" stroke-dashoffset="' + (-off) + '" transform="rotate(-90 60 60)"><title>' + it.label + ': ' + it.value + '</title></circle></a>';
            off += len;
        });
        svg += '<text class="df-big" x="60" y="60" text-anchor="middle" pointer-events="none">' + total + '</text>' +
            '<text class="df-sub" x="60" y="74" text-anchor="middle" pointer-events="none">Total</text></svg>';

        var legend = '<div class="df-leg">' + items.map(function (it) {
            var pct = Math.round((it.value / total) * 100);
            return '<a href="assets.html?status=' + encodeURIComponent(it.label) + '"><i style="background:' + it.color + '"></i>' +
                it.label + '<b>' + it.value + ' (' + pct + '%)</b></a>';
        }).join("") + '</div>';

        return '<div class="df-flex">' + svg + legend + '</div>';
    }

    function typesPanel(list) {
        var names = ["Laptop", "Desktop", "Printer", "Others"];
        var counts = { Laptop: 0, Desktop: 0, Printer: 0, Others: 0 };
        list.forEach(function (a) {
            var t = pick(a, ["asset_type", "type", "category"]).toLowerCase();
            if (t.indexOf("laptop") !== -1) counts.Laptop++;
            else if (t.indexOf("desktop") !== -1) counts.Desktop++;
            else if (t.indexOf("printer") !== -1) counts.Printer++;
            else counts.Others++;
        });

        var max = Math.max(counts.Laptop, counts.Desktop, counts.Printer, counts.Others, 1);
        var step = Math.max(1, Math.ceil(max / 4));
        var top = step * 4;

        var html = '<div class="dt-chart"><div class="dt-grid">';
        for (var i = 4; i >= 0; i--) {
            html += '<div class="dt-line" style="bottom:' + (i * 25) + '%"><span>' + (i * step) + '</span></div>';
        }
        html += '</div><div class="dt-cols">';
        names.forEach(function (n) {
            var h = counts[n] ? Math.max(3, Math.round((counts[n] / top) * 100)) : 0;
            var href = n === "Others" ? "assets.html" : "assets.html?type=" + n;
            html += '<a class="dt-col" href="' + href + '" title="' + n + ': ' + counts[n] + '"><b>' + counts[n] +
                '</b><div class="dt-bar" style="height:' + h + '%"></div><em>' + n + '</em></a>';
        });
        return html + '</div></div>';
    }

    function build(list) {
        document.getElementById("dfA").innerHTML =
            card("&#128200;", "Utilization Trend", "Assigned vs available by purchase year", utilization(list)) +
            card("&#127942;", "Top Brands", "Most common brands", topBrands(list)) +
            card("&#128276;", "Warranty Alerts", "Expired or expiring in 90 days", warranty(list));

        document.getElementById("dfB").innerHTML =
            card("&#128202;", "Asset Status", "Click a slice or a row to open assets", statusPanel(list)) +
            card("&#127991;", "Asset Types", "Click a bar to open assets", typesPanel(list));
    }

    document.addEventListener("DOMContentLoaded", function () {
        var anchor = document.querySelector(".dashboard-stats");
        if (!anchor) return;

        anchor.insertAdjacentHTML("afterend",
            '<div class="df-row three" id="dfA"></div><div class="df-row two" id="dfB"></div>');

        fetch("/api/assets")
            .then(function (r) { return r.json(); })
            .then(function (d) { build(Array.isArray(d.assets) ? d.assets : []); })
            .catch(function (e) { console.error("Dashboard final:", e); });
    });
})();