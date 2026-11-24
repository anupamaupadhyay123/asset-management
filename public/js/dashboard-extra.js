// Extra dashboard features: count-up animation + insight panels
(function () {
    "use strict";

    // ---------- helpers ----------
    function pick(obj, keys) {
        for (var i = 0; i < keys.length; i++) {
            var v = obj[keys[i]];
            if (v !== undefined && v !== null && String(v).trim() !== "") return v;
        }
        return "";
    }

    function esc(text) {
        return String(text).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function parseDate(value) {
        if (!value) return null;
        var s = String(value).trim();
        var m = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/);
        var d = m ? new Date(+m[3], +m[2] - 1, +m[1]) : new Date(s);
        return isNaN(d.getTime()) ? null : d;
    }

    // ---------- count-up animation ----------
    function countUp(el, target) {
        el.dataset.animating = "1";
        var start = performance.now();
        var duration = 900;

        function frame(now) {
            var t = Math.min((now - start) / duration, 1);
            var eased = 1 - Math.pow(1 - t, 3);
            el.textContent = Math.round(target * eased);
            if (t < 1) {
                requestAnimationFrame(frame);
            } else {
                el.textContent = target;
                el.dataset.shown = String(target);
                el.dataset.animating = "0";
            }
        }
        requestAnimationFrame(frame);
    }

    function watchNumber(id) {
        var el = document.getElementById(id);
        if (!el) return;

        new MutationObserver(function () {
            if (el.dataset.animating === "1") return;
            var target = parseInt(el.textContent, 10);
            if (isNaN(target)) return;
            if (el.dataset.shown === String(target)) return;

            if (target === 0) {
                el.dataset.shown = "0";
                return;
            }
            countUp(el, target);
        }).observe(el, { childList: true, characterData: true, subtree: true });
    }

    ["totalAssets", "availableAssets", "assignedAssets", "repairAssets", "retiredAssets", "chartTotal"]
        .forEach(watchNumber);

    // ---------- insight panels ----------
    function injectPanels() {
        var grid = document.querySelector(".dashboard-chart-grid");
        if (!grid || document.getElementById("dxPanels")) return false;

        grid.insertAdjacentHTML("afterend",
            '<div class="dx-grid" id="dxPanels">' +

            '<div class="dashboard-panel">' +
            '<div class="panel-header"><div><h3>Utilization</h3><p>Assets currently in use</p></div></div>' +
            '<div class="dx-ring" id="dxRing"><div class="dx-ring-inner">' +
            '<strong id="dxRingValue">0%</strong><span>Assigned</span></div></div>' +
            '<div class="dx-note" id="dxRingNote"></div>' +
            '</div>' +

            '<div class="dashboard-panel">' +
            '<div class="panel-header"><div><h3>Top Brands</h3><p>Most common brands</p></div></div>' +
            '<div id="dxBrands"><div class="dx-empty">Loading...</div></div>' +
            '</div>' +

            '<div class="dashboard-panel">' +
            '<div class="panel-header"><div><h3>Warranty Alerts</h3><p>Expired or expiring in 90 days</p></div></div>' +
            '<div id="dxWarranty"><div class="dx-empty">Loading...</div></div>' +
            '</div>' +

            '</div>'
        );
        return true;
    }

    function renderUtilization(list) {
        var total = list.length;
        var assigned = list.filter(function (a) {
            return String(a.status || "").toLowerCase() === "assigned";
        }).length;
        var pct = total ? Math.round((assigned / total) * 100) : 0;

        document.getElementById("dxRing").style.setProperty("--p", pct);
        document.getElementById("dxRingValue").textContent = pct + "%";
        document.getElementById("dxRingNote").textContent = assigned + " of " + total + " assets assigned";
    }

    function renderBrands(list) {
        var box = document.getElementById("dxBrands");
        var counts = {};
        list.forEach(function (a) {
            var b = String(pick(a, ["brand", "make", "manufacturer"])).trim();
            if (b) counts[b] = (counts[b] || 0) + 1;
        });

        var rows = Object.keys(counts)
            .map(function (k) { return { name: k, count: counts[k] }; })
            .sort(function (x, y) { return y.count - x.count; })
            .slice(0, 5);

        if (!rows.length) {
            box.innerHTML = '<div class="dx-empty">Brand data not found in assets.</div>';
            return;
        }

        var max = rows[0].count;
        box.innerHTML = rows.map(function (r) {
            return '<div class="dx-bar-row">' +
                '<div class="dx-bar-label"><span>' + esc(r.name) + '</span><strong>' + r.count + '</strong></div>' +
                '<div class="dx-bar-track"><div class="dx-bar-fill" style="width:' +
                Math.round((r.count / max) * 100) + '%"></div></div></div>';
        }).join("");
    }

    function renderWarranty(list) {
        var box = document.getElementById("dxWarranty");
        var today = new Date();
        today.setHours(0, 0, 0, 0);

        var items = [];
        list.forEach(function (a) {
            var d = parseDate(pick(a, ["warranty_expiry", "warranty_expiry_date", "warranty_end", "warranty_end_date", "warranty"]));
            if (!d) return;
            var days = Math.ceil((d - today) / 86400000);
            if (days <= 90) items.push({ asset: a, days: days });
        });

        if (!items.length) {
            box.innerHTML = '<div class="dx-empty">No warranty alerts right now.</div>';
            return;
        }

        items.sort(function (x, y) { return x.days - y.days; });
        var expired = items.filter(function (i) { return i.days < 0; }).length;
        var soon = items.length - expired;

        var html = '<div class="dx-note" style="text-align:left">' + expired + ' expired, ' + soon + ' expiring soon</div>';
        html += items.slice(0, 6).map(function (i) {
            var a = i.asset;
            var name = pick(a, ["asset_id", "asset_code"]) + " " + pick(a, ["brand", "make"]) + " " + pick(a, ["model", "asset_type", "type"]);
            var badge = i.days < 0
                ? '<span class="dx-badge red">Expired</span>'
                : '<span class="dx-badge amber">' + i.days + ' days left</span>';
            return '<div class="dx-warn-row"><span>' + esc(name.trim()) + '</span>' + badge + '</div>';
        }).join("");

        box.innerHTML = html;
    }

    function loadInsights() {
        fetch("/api/assets")
            .then(function (r) { return r.json(); })
            .then(function (d) {
                var list = Array.isArray(d.assets) ? d.assets : (Array.isArray(d) ? d : []);
                renderUtilization(list);
                renderBrands(list);
                renderWarranty(list);
            })
            .catch(function (err) {
                console.error("Dashboard extra:", err);
            });
    }

    document.addEventListener("DOMContentLoaded", function () {
        if (injectPanels()) loadInsights();
    });
})();