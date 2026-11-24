// Converts UTC timestamps in Recent Activity to the browser's local time (IST)
(function () {
    "use strict";

    var re = /(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/;
    var done = new WeakSet();

    function pad(n) { return String(n).padStart(2, "0"); }

    function toLocal(m) {
        var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]));
        return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate()) + " " +
            pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
    }

    function fix() {
        var box = document.getElementById("recentActivity");
        if (!box) return;
        var walker = document.createTreeWalker(box, NodeFilter.SHOW_TEXT);
        var node;
        while ((node = walker.nextNode())) {
            if (done.has(node)) continue;
            var m = node.nodeValue.match(re);
            if (!m) continue;
            node.nodeValue = node.nodeValue.replace(re, toLocal(m));
            done.add(node);
        }
    }

    document.addEventListener("DOMContentLoaded", function () {
        var box = document.getElementById("recentActivity");
        if (!box) return;
        new MutationObserver(fix).observe(box, { childList: true, subtree: true });
        fix();
    });
})();