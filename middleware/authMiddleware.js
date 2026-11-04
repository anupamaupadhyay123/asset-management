// ============================================================
// AUTHENTICATION + PERMISSION MIDDLEWARE
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================

const db = require("../database/database");

function requireLogin(req, res, next) {
    if (req.session && req.session.user) return next();

    if (req.originalUrl.startsWith("/api/")) {
        return res.status(401).json({
            success: false,
            authenticated: false,
            message: "Authentication required."
        });
    }

    return res.redirect("/login.html");
}

function requirePermission(permissionKey) {
    return (req, res, next) => {
        if (!req.session?.user) {
            return res.status(401).json({
                success: false,
                authenticated: false,
                message: "Authentication required."
            });
        }

        // Admin has full access.
        if (req.session.user.role === "Admin") return next();

        db.get(
            `SELECT 1 FROM user_permissions WHERE user_id = ? AND permission_key = ? AND enabled = 1 LIMIT 1`,
            [req.session.user.id, permissionKey],
            (error, row) => {
                if (error) {
                    console.error("Permission check error:", error.message);
                    return res.status(500).json({
                        success: false,
                        message: "Unable to check user permission."
                    });
                }

                if (!row) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied for this action."
                    });
                }

                next();
            }
        );
    };
}

function getUserPermissions(userId, callback) {
    db.all(
        `SELECT permission_key FROM user_permissions WHERE user_id = ? AND enabled = 1`,
        [userId],
        callback
    );
}

module.exports = {
    requireLogin,
    requirePermission,
    getUserPermissions
};
