// ============================================================
// PERMISSION MIDDLEWARE
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================

const db = require("../database/database");

const PERMISSIONS = {
    DASHBOARD_VIEW: "dashboard_view",
    ASSETS_VIEW: "assets_view",
    ASSETS_ADD: "assets_add",
    ASSETS_EDIT: "assets_edit",
    ASSETS_DELETE: "assets_delete",
    ASSETS_ASSIGN: "assets_assign",
    ASSETS_RETURN: "assets_return",
    ASSETS_IMPORT: "assets_import",
    ASSETS_REPAIR: "assets_repair",
    ASSETS_RETIRE: "assets_retire",
    REPORTS_VIEW: "reports_view",
    REPORTS_EXPORT: "reports_export",
    REPORTS_BACKUP: "reports_backup",
    REPORTS_RESTORE: "reports_restore",
    ACTIVITY_VIEW: "activity_view",
    USER_MANAGEMENT: "user_management",
    SETTINGS_VIEW: "settings_view"
};

const PERMISSION_LABELS = {
    dashboard_view: "Dashboard - View",
    assets_view: "Assets - View",
    assets_add: "Assets - Add",
    assets_edit: "Assets - Edit",
    assets_delete: "Assets - Delete",
    assets_assign: "Assets - Assign",
    assets_return: "Assets - Return",
    assets_import: "Assets - Import",
    assets_repair: "Assets - Repair",
    assets_retire: "Assets - Retire",
    reports_view: "Reports - View",
    reports_export: "Reports - Export",
    reports_backup: "Reports - Backup",
    reports_restore: "Reports - Restore",
    activity_view: "Activity Logs - View",
    user_management: "User Management",
    settings_view: "Settings - View"
};

const ALL_PERMISSIONS = Object.keys(PERMISSION_LABELS);

function getUserPermissions(userId, callback) {
    if (!userId) return callback(null, []);

    db.all(
        `SELECT permission FROM user_permissions WHERE user_id = ? ORDER BY permission`,
        [userId],
        (error, rows) => {
            if (error) return callback(error);
            callback(null, (rows || []).map(row => row.permission));
        }
    );
}

function isAdmin(req) {
    return !!(
        req.session &&
        req.session.user &&
        String(req.session.user.role || "").toLowerCase() === "admin"
    );
}

function hasPermission(req, permission, callback) {
    if (isAdmin(req)) return callback(null, true);
    if (!req.session || !req.session.user) return callback(null, false);

    getUserPermissions(req.session.user.id, (error, permissions) => {
        if (error) return callback(error, false);
        callback(null, permissions.includes(permission));
    });
}

function requirePermission(permission) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.status(401).json({
                success: false,
                message: "Authentication required."
            });
        }

        hasPermission(req, permission, (error, allowed) => {
            if (error) {
                console.error("Permission check error:", error.message);
                return res.status(500).json({
                    success: false,
                    message: "Unable to verify permissions."
                });
            }

            if (!allowed) {
                return res.status(403).json({
                    success: false,
                    message: "You do not have permission to perform this action.",
                    permission
                });
            }

            next();
        });
    };
}

function assetPermission(req, res, next) {
    const path = (req.path || "").toLowerCase();
    let permission = PERMISSIONS.ASSETS_VIEW;

    if (req.method === "GET") {
        permission = path === "/next-id"
            ? PERMISSIONS.ASSETS_ADD
            : PERMISSIONS.ASSETS_VIEW;
    } else if (path === "/import") {
        permission = PERMISSIONS.ASSETS_IMPORT;
    } else if (path === "/repair/start" || path === "/repair/complete") {
        permission = PERMISSIONS.ASSETS_REPAIR;
    } else if (path === "/retire") {
        permission = PERMISSIONS.ASSETS_RETIRE;
    } else if (req.method === "POST") {
        permission = PERMISSIONS.ASSETS_ADD;
    } else if (["PUT", "PATCH"].includes(req.method)) {
        permission = PERMISSIONS.ASSETS_EDIT;
    } else if (req.method === "DELETE") {
        permission = PERMISSIONS.ASSETS_DELETE;
    }

    return requirePermission(permission)(req, res, next);
}

function assignmentPermission(req, res, next) {
    const path = (req.path || "").toLowerCase();
    let permission = PERMISSIONS.ASSETS_VIEW;

    if (req.method === "POST" && path === "/") {
        permission = PERMISSIONS.ASSETS_ASSIGN;
    } else if (req.method === "POST" && path === "/return") {
        permission = PERMISSIONS.ASSETS_RETURN;
    } else {
        permission = PERMISSIONS.ASSETS_VIEW;
    }

    return requirePermission(permission)(req, res, next);
}

function reportPermission(req, res, next) {
    const path = (req.path || "").toLowerCase();

    if (path === "/backup") {
        return requirePermission(PERMISSIONS.REPORTS_BACKUP)(req, res, next);
    }

    if (path === "/restore") {
        return requirePermission(PERMISSIONS.REPORTS_RESTORE)(req, res, next);
    }

    if (path === "/activity-logs") {
        return requirePermission(PERMISSIONS.ACTIVITY_VIEW)(req, res, next);
    }

    if (path.includes("/excel")) {
        return requirePermission(PERMISSIONS.REPORTS_EXPORT)(req, res, next);
    }

    return requirePermission(PERMISSIONS.REPORTS_VIEW)(req, res, next);
}

module.exports = {
    PERMISSIONS,
    PERMISSION_LABELS,
    ALL_PERMISSIONS,
    getUserPermissions,
    hasPermission,
    requirePermission,
    assetPermission,
    assignmentPermission,
    reportPermission,
    isAdmin
};
