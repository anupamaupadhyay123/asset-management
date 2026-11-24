// Dashboard charts: clickable pie/donut/bar/column charts
(function () {
    "use strict";

    var COLORS = ["#2563eb", "#16a34a", "#f59e0b", "#7c3aed", "#06b6d4", "#ef4444", "#64748b", "#ec4899"];
    var STATUS_COLORS = { available: "#16a34a", assigned: "#2563eb", "under repair": "#f59e0b", retired: "#94a3b8" };

    var css = document.createElement("style");
    css.textContent =
        ".dc-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:20px;margin-bottom:24px}" +
        "@media(max-width:1000px){.dc-grid{grid-template-columns:1fr}}" +
        ".dc-wrap{display:flex;align-items:center;gap:20px;flex-wrap:wrap;justify-content:center}" +
        ".dc-svg{width:210px;height:210px}" +
        ".dc-slice{transition:transform .2s;transform-box:view-box;transform-origin:100px 100px;cursor:pointer}" +
        ".dc-slice:hover{transform:scale(1.06)}" +
        ".dc-center{font-size:26px;font-weight:700;fill:#0b1437;text-anchor:middle}" +
        ".dc-center-sub{font-size:11px;fill:#64748b;text-anchor:middle}" +
        ".dc-legend a{display:flex;align-items:center;gap:8px;padding:5px 8px;border-radius:8px;color:#334155;font-size:13px;text-decoration:none}" +
        ".dc-legend a:hover{background:#eff6ff}" +
        ".dc-dot{width:11px;height:11px;border-radius:50%;flex:none}" +
        ".dc-legend b{margin-left:auto;padding-left:14px}" +
        ".dc-bar{display:block;margin:10px 0;text-decoration:none;color:#334155;font-size:13px}" +
        ".dc-bar:hover .dc-fill{filter:brightness(1.15)}" +
        ".dc-bar-top{display:flex;justify-content:space-between;margin-bottom:4px}" +
        ".dc-track{height:11px;background:#e2e8f0;border-radius:99px;overflow:hidden}" +
        ".dc-fill{height:100%;border-radius:99px;background:linear-gradient(90deg,#2563eb,#06b6d4)}" +
        ".dc-cols{display:flex;align-items:flex-end;gap:14px;height:190px;padding-top:10px}" +
        ".dc-col{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;text-decoration:none;color:#334155;font-size:12px}" +
        ".dc-col-bar{width:100%;max-width:46px;border-radius:8px 8px 0 0;background:linear-gradient(180deg,#06b6d4,#2563eb);transition:filter .2s}" +
        ".dc-col:hover .dc-col-bar{filter:brightness(1.15)}" +
        ".dc-empty{color:#64748b;font-size:13px;padding:14px 0;text-align:center}" +
        ".dashboard-stat-card{cursor:pointer}";
    document.head.appendChild(css);

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

    function countBy(list, fn) {
        var m = {};
        list.forEach(function (a) {
            var k = fn(a);
            if (k) m[k] = (m[k] || 0) + 1;
        });
        return Object.keys(m).map(function (k) { return { label: k, value: m[k] }; })
            .sort(function (x, y) { return y.value - x.value; });
    }

    function xy(r, a) {
        return (100 + r * Math.cos(a)).toFixed(2) + " " + (100 + r * Math.sin(a)).toFixed(2);
    }

    // Pie / donut chart where every slice and legend row is a link
    function pie(boxId, items, param, donut, centerText) {
        var box = document.getElementById(boxId);
        var total = items.reduce(function (s, i) { return s + i.value; }, 0);
        if (!total) { box.innerHTML = '<div class="dc-empty">No data available</div>'; return; }

        var svg = '<svg class="dc-svg" viewBox="0 0 200 200">';
        var start = -Math.PI / 2;

        items.forEach(function (it, idx) {
            var href = "assets.html?" + param + "=" + encodeURIComponent(it.label);
            var tip = it.label + ": " + it.value;
            var a1 = start + (it.value / total) * Math.PI * 2;
            var shape;
            if (items.length === 1) {
                shape = '<circle cx="100" cy="100" r="92" fill="' + it.color + '"/>';
            } else {
                var big = (a1 - start) > Math.PI ? 1 : 0;
                shape = '<path d="M100 100 L' + xy(92, start) + " A92 92 0 " + big + " 1 " + xy(92, a1) +
                    ' Z" fill="' + it.color + '" stroke="#fff" stroke-width="2"/>';
            }
            svg += '<a href="' + href + '"><g class="dc-slice"><title>' + esc(tip) + "</title>" + shape + "</g></a>";
            start = a1;
        });

        if (donut) {
            svg += '<circle cx="100" cy="100" r="56" fill="#fff" pointer-events="none"/>' +
                '<text class="dc-center" x="100" y="106" pointer-events="none">' + total + "</text>" +
                '<text class="dc-center-sub" x="100" y="124" pointer-events="none">' + centerText + "</text>";
        }
        svg += "</svg>";

        var legend = '<div class="dc-legend">' + items.map(function (it) {
            var pct = Math.round((it.value / total) * 100);
            return '<a href="assets.html?' + param + "=" + encodeURIComponent(it.label) + '">' +
                '<span class="dc-dot" style="background:' + it.color + '"></span>' +
                esc(it.label) + "<b>" + it.value + " (" + pct + "%)</b></a>";
        }).join("") + "</div>";

        box.innerHTML = '<div class="dc-wrap">' + svg + legend + "</div>";
    }

    function bars(boxId, items, param) {
        var box = document.getElementById(boxId);
        items = items.slice(0, 6);
        if (!items.length) { box.innerHTML = '<div class="dc-empty">No data available</div>'; return; }
        var max = items[0].value;
        box.innerHTML = items.map(function (it) {
            return '<a class="dc-bar" href="assets.html?' + param + "=" + encodeURIComponent(it.label) + '">' +
                '<div class="dc-bar-top"><span>' + esc(it.label) + "</span><b>" + it.value + "</b></div>" +
                '<div class="dc-track"><div class="dc-fill" style="width:' + Math.round((it.value / max) * 100) + '%"></div></div></a>';
        }).join("");
    }

    function columns(boxId, items) {
        var box = document.getElementById(boxId);
        if (!items.length) { box.innerHTML = '<div class="dc-empty">Purchase dates not found</div>'; return; }
        var max = Math.max.apply(null, items.map(function (i) { return i.value; }));
        box.innerHTML = '<div class="dc-cols">' + items.map(function (it) {
            return '<a class="dc-col" href="assets.html?year=' + it.label + '" title="' + it.value + ' assets">' +
                "<b>" + it.value + '</b><div class="dc-col-bar" style="height:' + Math.max(8, Math.round((it.value / max) * 140)) +
                'px"></div><span>' + it.label + "</span></a>";
        }).join("") + "</div>";
    }

    function panel(title, sub, id) {
        return '<div class="dashboard-panel"><div class="panel-header"><div><h3>' + title + "</h3><p>" + sub +
            '</p></div></div><div id="' + id + '"><div class="dc-empty">Loading...</div></div></div>';
    }

    function build(list) {
        var statuses = countBy(list, function (a) { return pick(a, ["status"]); }).map(function (i, n) {
            i.color = STATUS_COLORS[i.label.toLowerCase()] || COLORS[n % COLORS.length];
            return i;
        });
        var types = countBy(list, function (a) { return pick(a, ["asset_type", "type", "category"]); })
            .map(function (i, n) { i.color = COLORS[n % COLORS.length]; return i; });
        var depts = countBy(list, function (a) { return pick(a, ["department", "location"]); });
        var years = countBy(list, function (a) {
            var d = new Date(pick(a, ["purchase_date", "purchase_year"]));
            return isNaN(d.getTime()) ? "" : String(d.getFullYear());
        }).sort(function (x, y) { return x.label - y.label; });

        pie("dcStatus", statuses, "status", false, "");
        pie("dcTypes", types, "type", true, "Assets");
        bars("dcDept", depts, "dept");
        columns("dcYears", years);
    }

    document.addEventListener("DOMContentLoaded", function () {
        var old = document.querySelector(".dashboard-chart-grid");
        if (!old) return;
        old.style.display = "none";

        old.insertAdjacentHTML("afterend",
            '<div class="dc-grid">' +
            panel("Asset Status", "Click a slice to open assets", "dcStatus") +
            panel("Asset Types", "Click a slice to open assets", "dcTypes") +
            panel("By Department / Location", "Top 6, click a bar", "dcDept") +
            panel("Purchase Year", "Assets bought per year", "dcYears") +
            "</div>");

        // Summary cards become clickable
        var cards = document.querySelectorAll(".dashboard-stat-card");
        var targets = ["", "status=Available", "status=Assigned", "status=Under%20Repair", "status=Retired"];
        cards.forEach(function (c, i) {
            c.addEventListener("click", function () {
                window.location.href = "assets.html" + (targets[i] ? "?" + targets[i] : "");
            });
        });

        fetch("/api/assets")
            .then(function (r) { return r.json(); })
            .then(function (d) { build(Array.isArray(d.assets) ? d.assets : []); })
            .catch(function (e) { console.error("Dashboard charts:", e); });
    });
})();