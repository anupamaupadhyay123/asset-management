// Applies ?status= / ?type= / ?dept= / ?year= filters (from dashboard clicks) to the assets table
(function () {
    "use strict";

    var params = new URLSearchParams(window.location.search);
    var keys = ["status", "type", "dept", "year"];
    var active = keys.filter(function (k) { return params.get(k); });
    if (!active.length) return;

    function apply() {
        var rows = document.querySelectorAll("table tbody tr");
        var shown = 0;
        rows.forEach(function (row) {
            var text = row.textContent.toLowerCase();
            var ok = active.every(function (k) { return text.indexOf(params.get(k).toLowerCase()) !== -1; });
            row.style.display = ok ? "" : "none";
            if (ok) shown++;
        });
        var note = document.getElementById("filterNote");
        if (note) note.querySelector("span").textContent = shown + " asset(s) shown";
    }

    document.addEventListener("DOMContentLoaded", function () {
        var table = document.querySelector("table");
        if (!table) return;

        var label = active.map(function (k) { return k + " = " + params.get(k); }).join(", ");
        table.insertAdjacentHTML("beforebegin",
            '<div id="filterNote" style="margin:10px 0;padding:10px 14px;background:#eff6ff;border-left:4px solid #2563eb;' +
            'border-radius:10px;font-size:14px">Filter: <b>' + label.replace(/</g, "&lt;") + '</b> &nbsp;|&nbsp; <span></span> ' +
            '&nbsp;<a href="assets.html" style="color:#2563eb;font-weight:600">Clear filter</a></div>');

        var body = table.querySelector("tbody");
        if (body) new MutationObserver(apply).observe(body, { childList: true });
        apply();
    });
})();