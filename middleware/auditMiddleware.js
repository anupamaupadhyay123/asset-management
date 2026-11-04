const db = require("../database/database");

function auditActivity(req, res, next) {
    if (!req.session || !req.session.user) return next();

    const user = req.session.user;
    const originalUrl = req.originalUrl || req.url || "";
    const path = originalUrl.split("?")[0];
    const method = req.method;

    // User-management routes write detailed audit records themselves.
    if (path.startsWith("/api/users")) return next();
    // Explicit UI events (View/Print) are logged by the audit-event endpoint.
    if (path === "/api/audit/event") return next();
    // Read-only polling and page loads are intentionally excluded to avoid noise.
    if (method === "GET" || method === "HEAD" || method === "OPTIONS") return next();
    // Report exports/backups have their own explicit audit records.
    if (path.startsWith("/api/reports/")) return next();

    let action = "System Activity";
    const isWrite = ["POST", "PUT", "PATCH", "DELETE"].includes(method);
    if (!isWrite) return next();
    if (path.includes("/api/assets/import")) action = "Asset Import";
    else if (path.includes("/api/assets/repair/start")) action = "Asset Sent for Repair";
    else if (path.includes("/api/assets/repair/complete")) action = "Asset Repair Completed";
    else if (path.includes("/api/assets/retire")) action = "Asset Retired";
    else if (path === "/api/assets" && method === "POST") action = "Asset Added";
    else if (path.startsWith("/api/assets/") && method === "PUT") action = "Asset Updated";
    else if (path.startsWith("/api/assets/") && method === "PATCH") action = "Asset Updated";
    else if (path.startsWith("/api/assets/") && method === "DELETE") action = "Asset Deleted";
    else if (path === "/api/assignments" && method === "POST") action = "Asset Assigned";
    else if (path.includes("/api/assignments/return")) action = "Asset Returned";
    else if (path.includes("/api/assignments")) action = "Assignment Updated";
    else if (path.startsWith("/api/settings")) action = "Settings Updated";

    res.on("finish", () => {
        if (res.statusCode >= 400) return;
        const assetId = (req.body && (req.body.asset_id || req.body.assetId)) || (req.params && (req.params.assetId || req.params.id)) || "";
        const detail = (req.body && (req.body.asset_id || req.body.assetId || req.body.username || req.body.full_name)) || "";
        const description = `${action}${detail ? ` (${detail})` : ""} - ${method} ${path}`;
        db.run(
            `INSERT INTO user_activity_log (user_id, username, full_name, action_type, description, asset_id, ip_address, user_agent)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                user.id, user.username || "", user.full_name || "", action,
                description, assetId, req.ip || "", req.get("user-agent") || ""
            ],
            error => {
                if (error) console.error("Audit log error:", error.message);
            }
        );
    });

    next();
}

module.exports = { auditActivity };
