// ===== Old Assets row at the bottom of the visible "Asset Status" card =====
// Change this number to change what counts as "old" (in years)
const OLD_ASSET_YEARS = 3;

(function () {
    let oldAssets = [];

    function esc(s) {
        return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
            return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
        });
    }

    function visible(el) {
        const b = el.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
    }

    function getOldAssets(assets) {
        const cutoff = new Date();
        cutoff.setFullYear(cutoff.getFullYear() - OLD_ASSET_YEARS);
        return assets
            .filter(function (a) {
                if (!a.purchase_date) return false;
                const d = new Date(a.purchase_date);
                return !isNaN(d) && d <= cutoff;
            })
            .sort(function (x, y) {
                return new Date(x.purchase_date) - new Date(y.purchase_date);
            });
    }

    function ageText(dateStr) {
        const d = new Date(dateStr);
        const now = new Date();
        const months = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
        return Math.floor(months / 12) + " yr " + (months % 12) + " mo";
    }

    function closeModal() {
        const m = document.getElementById("oldAssetsModal");
        if (m) m.remove();
    }

    function openModal() {
        closeModal();
        const cell = "padding:10px;border-bottom:1px solid #e2e8f0;";

        const rows = oldAssets.map(function (a) {
            return "<tr>" +
                "<td style='" + cell + "font-weight:600;'>" + esc(a.asset_id) + "</td>" +
                "<td style='" + cell + "'>" + esc(a.asset_type) + "</td>" +
                "<td style='" + cell + "'>" + esc((a.brand || "") + " " + (a.model || "")) + "</td>" +
                "<td style='" + cell + "'>" + esc(a.serial_number) + "</td>" +
                "<td style='" + cell + "'>" + esc(a.purchase_date) + "</td>" +
                "<td style='" + cell + "'>" + ageText(a.purchase_date) + "</td>" +
                "<td style='" + cell + "'>" + esc(a.status) + "</td>" +
                "</tr>";
        }).join("");

        const table = oldAssets.length
            ? "<div style='overflow-x:auto;'><table style='width:100%;border-collapse:collapse;font-size:15px;text-align:left;'>" +
              "<thead><tr style='background:#f1f5f9;'>" +
              "<th style='padding:10px;'>Asset ID</th><th style='padding:10px;'>Type</th><th style='padding:10px;'>Brand / Model</th>" +
              "<th style='padding:10px;'>Serial No.</th><th style='padding:10px;'>Purchase Date</th><th style='padding:10px;'>Age</th><th style='padding:10px;'>Status</th>" +
              "</tr></thead><tbody>" + rows + "</tbody></table></div>"
            : "<p style='padding:20px 0;color:#64748b;'>No old assets found.</p>";

        const wrap = document.createElement("div");
        wrap.id = "oldAssetsModal";
        wrap.style.cssText = "position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;";
        wrap.innerHTML =
            "<div style='background:#fff;color:#1e293b;border-radius:14px;width:min(950px,100%);max-height:85vh;overflow:auto;padding:24px;box-shadow:0 20px 50px rgba(0,0,0,0.3);'>" +
            "<div style='display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:16px;'>" +
            "<div><h2 style='margin:0;font-size:22px;'>Old Assets</h2>" +
            "<p style='margin:4px 0 0;color:#64748b;'>Purchased " + OLD_ASSET_YEARS + "+ years ago (" + oldAssets.length + " found)</p></div>" +
            "<button id='oldAssetsClose' style='border:none;background:transparent;font-size:28px;cursor:pointer;line-height:1;'>&times;</button>" +
            "</div>" + table + "</div>";

        wrap.addEventListener("click", function (e) {
            if (e.target === wrap) closeModal();
        });
        document.body.appendChild(wrap);
        document.getElementById("oldAssetsClose").addEventListener("click", closeModal);
    }

    document.addEventListener("keydown", function (e) {
        if (e.key === "Escape") closeModal();
    });

    // Find the visible "Asset Status" card (the biggest container that does not also hold "Asset Types")
    function findStatusCard() {
        const heading = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6,div,span,strong,b,p"))
            .find(function (el) {
                return el.children.length === 0 && el.textContent.trim() === "Asset Status" && visible(el);
            });
        if (!heading) return null;

        let card = heading.parentElement;
        let p = heading.parentElement;
        while (p && p !== document.body) {
            if (p.textContent.indexOf("Asset Types") !== -1) break;
            card = p;
            p = p.parentElement;
        }
        return card;
    }

    function ensureRow() {
        const oldCard = document.getElementById("oldAssetsCard");
        if (oldCard) oldCard.remove();

        const existing = document.getElementById("oldAssetsRow");
        if (existing) {
            if (visible(existing)) {
                const c = existing.querySelector("b");
                if (c && c.textContent !== String(oldAssets.length)) c.textContent = oldAssets.length;
                return;
            }
            existing.remove();
        }

        const card = findStatusCard();
        if (!card) return;

        const row = document.createElement("div");
        row.id = "oldAssetsRow";
        row.style.cssText = "display:flex;align-items:center;gap:12px;margin:14px 24px 20px;padding:12px 16px;border-radius:12px;background:#f5f3ff;cursor:pointer;font-size:16px;color:#1e293b;";
        row.innerHTML =
            "<span style='width:12px;height:12px;border-radius:50%;background:#8b5cf6;flex:none;'></span>" +
            "<span style='flex:1;'>Old Assets (" + OLD_ASSET_YEARS + "+ yrs)</span>" +
            "<b>" + oldAssets.length + "</b>" +
            "<span style='font-size:20px;line-height:1;'>&rsaquo;</span>";

        row.addEventListener("mouseenter", function () { row.style.background = "#ede9fe"; });
        row.addEventListener("mouseleave", function () { row.style.background = "#f5f3ff"; });
        row.addEventListener("click", function (e) {
            e.preventDefault();
            e.stopPropagation();
            openModal();
        });

        card.appendChild(row);
    }

    async function init() {
        try {
            const res = await fetch("/api/assets");
            const data = await res.json();
            const list = Array.isArray(data) ? data : (data.assets || data.data || []);
            oldAssets = getOldAssets(list);
        } catch (err) {
            console.error("Old assets load error:", err);
            oldAssets = [];
        }
        ensureRow();
        setInterval(ensureRow, 1500);
    }

    document.addEventListener("DOMContentLoaded", init);
})();
