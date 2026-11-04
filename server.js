require("dotenv").config();
const express = require("express");
const path = require("path");
const session = require("express-session");

const db = require("./database/database");

const assetRoutes =
    require("./routes/assetRoutes");

const assignmentRoutes =
    require("./routes/assignmentRoutes");

const dashboardRoutes =
    require("./routes/dashboardRoutes");

const reportRoutes =
    require("./routes/reportRoutes");

const authRoutes =
    require("./routes/authRoutes");

const userRoutes =
    require("./routes/userRoutes");

const auditRoutes =
    require("./routes/auditRoutes");

const {
    requireLogin,
    requirePermission
} =
    require("./middleware/authMiddleware");

const {
    auditActivity
} =
    require("./middleware/auditMiddleware");


const app = express();

const PORT = 3000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(
    express.json({ limit: "50mb" })
);

app.use(
    express.urlencoded({
        extended: true
    })
);


// ============================================================
// SESSION
// ============================================================

app.use(
    session({

        secret:
            "ROF_ASSET_MANAGEMENT_SESSION_SECRET_CHANGE_THIS",

        resave: false,

        saveUninitialized: false,

        cookie: {

            httpOnly: true,

            secure: false,

            // Session cookie: closing the browser removes the login cookie.
            // Do not use maxAge here.
            sameSite: "lax"

        }

    })
);


// ============================================================
// HTML PAGE ACCESS GUARD
// ============================================================
// express.static would otherwise serve HTML files before the
// protected page routes below. Guard them before static files.

const pagePermissions = {
    "/index.html": "dashboard_view",
    "/assets.html": "asset_view",
    "/reports.html": "report_view",
    "/settings.html": "settings_view",
    "/asset-issuance.html": "asset_view"
};

app.use((req, res, next) => {
    const requestedPath = (req.path || "").split("?")[0];

    if (requestedPath === "/login.html" || requestedPath === "/forgot-password.html") {
        return next();
    }

    const requiredPermission = pagePermissions[requestedPath];
    if (!requiredPermission) return next();

    if (!req.session?.user) return res.redirect("/login.html");
    if (req.session.user.role === "Admin") return next();

    const db = require("./database/database");
    db.get(
        `SELECT 1 FROM user_permissions WHERE user_id = ? AND permission_key = ? AND enabled = 1 LIMIT 1`,
        [req.session.user.id, requiredPermission],
        (error, row) => {
            if (error) {
                console.error("Page permission error:", error.message);
                return res.status(500).send("Unable to check page permission.");
            }
            if (!row) return res.status(403).send("Access denied.");
            next();
        }
    );
});


// ============================================================
// PUBLIC STATIC FILES
// ============================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "public"
        ),
        {
            index: false
        }
    )
);


// ============================================================
// AUTHENTICATION API
// ============================================================
//
// Login / Logout / Current User public rahenge.
//

app.use(
    "/api/auth",
    authRoutes
);

// Audit authenticated API activity.
app.use(auditActivity);
app.use("/api/audit", requireLogin, auditRoutes);


// ============================================================
// PROTECTED API ROUTES
// ============================================================

function assetPermissionGate(req, res, next) {
    const path = req.path || "/";
    if (path === "/import") return requirePermission("asset_import")(req, res, next);
    if (path === "/repair/start" || path === "/repair/complete") return requirePermission("asset_repair")(req, res, next);
    if (path === "/retire") return requirePermission("asset_retire")(req, res, next);
    if (req.method === "GET") return requirePermission("asset_view")(req, res, next);
    if (req.method === "POST") return requirePermission("asset_create")(req, res, next);
    if (req.method === "PUT" || req.method === "PATCH") return requirePermission("asset_edit")(req, res, next);
    if (req.method === "DELETE") return requirePermission("asset_delete")(req, res, next);
    next();
}

function assignmentPermissionGate(req, res, next) {
    if (req.path === "/return") return requirePermission("asset_return")(req, res, next);
    if (req.method === "POST") return requirePermission("asset_assign")(req, res, next);
    return requirePermission("asset_view")(req, res, next);
}

function reportPermissionGate(req, res, next) {
    if (req.path === "/backup" || req.path === "/restore") return requirePermission("backup_restore")(req, res, next);
    if (req.path === "/assets/excel") return requirePermission("report_export")(req, res, next);
    return requirePermission("report_view")(req, res, next);
}


// ------------------------------------------------------------
// USER MANAGEMENT
// ------------------------------------------------------------

app.use(
    "/api/users",
    requireLogin,
    userRoutes
);


// ------------------------------------------------------------
// ASSETS
// ------------------------------------------------------------

app.use(
    "/api/assets",
    requireLogin,
    assetPermissionGate,
    assetRoutes
);


// ------------------------------------------------------------
// ASSIGNMENTS
// ------------------------------------------------------------

app.use(
    "/api/assignments",
    requireLogin,
    assignmentPermissionGate,
    assignmentRoutes
);


// ------------------------------------------------------------
// DASHBOARD
// ------------------------------------------------------------

app.use(
    "/api/dashboard",
    requireLogin,
    requirePermission("dashboard_view"),
    dashboardRoutes
);


// ------------------------------------------------------------
// REPORTS
// ------------------------------------------------------------

app.use(
    "/api/reports",
    requireLogin,
    reportPermissionGate,
    reportRoutes
);


// ============================================================
// PUBLIC LOGIN PAGE
// ============================================================

app.get(
    "/login.html",
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "login.html"
            )
        );

    }
);


// ============================================================
// PROTECTED DASHBOARD
// ============================================================

app.get(
    "/",
    requireLogin,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


app.get(
    "/index.html",
    requireLogin,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "index.html"
            )
        );

    }
);


// ============================================================
// PROTECTED ASSETS PAGE
// ============================================================

app.get(
    "/assets.html",
    requireLogin,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "assets.html"
            )
        );

    }
);


// ============================================================
// PROTECTED REPORTS PAGE
// ============================================================

app.get(
    "/reports.html",
    requireLogin,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "reports.html"
            )
        );

    }
);


// ============================================================
// PROTECTED SETTINGS PAGE
// ============================================================

app.get(
    "/settings.html",
    requireLogin,
    (req, res) => {

        res.sendFile(
            path.join(
                __dirname,
                "public",
                "settings.html"
            )
        );

    }
);


// ============================================================
// START SERVER
// ============================================================

//app.listen(
    //PORT,
    //() => {

//         console.log(
//             `Asset Management System running at http://localhost:${PORT}`
//         );

//     }
// );
app.listen(3000, "0.0.0.0", () => {
    console.log("Server running on port 3000");
});