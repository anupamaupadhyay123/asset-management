const express = require("express");
const router = express.Router();
const db = require("../database/database");

const ALLOWED_ACTIONS = new Set([
  "Asset Viewed", "Asset Print Requested", "Issuance Form Printed",
  "Report Page Viewed", "Report Exported", "Backup Downloaded", "Backup Restored"
]);

router.post("/event", (req, res) => {
  const user = req.session?.user;
  if (!user) return res.status(401).json({ success: false, message: "Authentication required." });
  const action = String(req.body?.action || "").trim();
  const assetId = String(req.body?.assetId || req.body?.asset_id || "").trim().slice(0, 120);
  const note = String(req.body?.description || "").trim().slice(0, 500);
  if (!ALLOWED_ACTIONS.has(action)) return res.status(400).json({ success: false, message: "Unsupported audit event." });
  const description = `${action}${assetId ? ` for asset ${assetId}` : ""}${note ? ` — ${note}` : ""}`;
  db.run(
    `INSERT INTO user_activity_log (user_id, username, full_name, action_type, description, asset_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [user.id || null, user.username || "", user.full_name || "", action, description, assetId, req.ip || "", req.get("user-agent") || ""],
    error => {
      if (error) {
        console.error("Explicit audit event error:", error.message);
        return res.status(500).json({ success: false, message: "Unable to record activity." });
      }
      res.json({ success: true });
    }
  );
});

module.exports = router;
