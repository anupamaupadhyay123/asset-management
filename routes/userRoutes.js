// ============================================================
// USER MANAGEMENT ROUTES
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================

const express = require("express");
const crypto = require("crypto");

const router = express.Router();
const db = require("../database/database");

const PERMISSIONS = [
    ["dashboard_view", "Dashboard - View"],
    ["asset_view", "Assets - View"],
    ["asset_create", "Assets - Add"],
    ["asset_edit", "Assets - Edit"],
    ["asset_delete", "Assets - Delete"],
    ["asset_assign", "Assets - Assign"],
    ["asset_return", "Assets - Return"],
    ["asset_import", "Assets - Import"],
    ["asset_repair", "Assets - Repair"],
    ["asset_retire", "Assets - Retire"],
    ["report_view", "Reports - View"],
    ["report_export", "Reports - Export"],
    ["backup_restore", "Backup / Restore"],
    ["activity_view", "Activity Logs - View"],
    ["user_management", "User Management"],
    ["settings_view", "Settings - View"]
];

const PERMISSION_KEYS = new Set(PERMISSIONS.map(item => item[0]));

function hashPassword(password) {
    return new Promise((resolve, reject) => {
        const salt = crypto.randomBytes(16).toString("hex");
        crypto.scrypt(password, salt, 64, (error, derivedKey) => {
            if (error) return reject(error);
            resolve(`${salt}:${derivedKey.toString("hex")}`);
        });
    });
}

function safeUser(row) {
    return {
        id: row.id,
        username: row.username,
        full_name: row.full_name || "",
        email: row.email || "",
        role: row.role || "Viewer",
        is_active: Number(row.is_active) === 1,
        created_at: row.created_at
    };
}

function requireUserManagement(req, res, next) {
    if (req.session?.user?.role === "Admin") return next();

    const userId = req.session?.user?.id;
    if (!userId) {
        return res.status(401).json({ success: false, message: "Authentication required." });
    }

    db.get(
        `SELECT 1 FROM user_permissions WHERE user_id = ? AND permission_key = ? AND enabled = 1 LIMIT 1`,
        [userId, "user_management"],
        (error, row) => {
            if (error) {
                console.error("User permission check error:", error.message);
                return res.status(500).json({ success: false, message: "Unable to check permission." });
            }
            if (!row) {
                return res.status(403).json({ success: false, message: "You do not have permission to manage users." });
            }
            next();
        }
    );
}

function writeAudit(req, action, description, targetUserId = "") {
    const user = req.session?.user;
    if (!user) return;

    db.run(
        `INSERT INTO user_activity_log
        (user_id, username, full_name, action_type, description, asset_id, ip_address, user_agent)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            user.id || null,
            user.username || "",
            user.full_name || "",
            action,
            description,
            targetUserId ? `USER:${targetUserId}` : "",
            req.ip || "",
            req.get("user-agent") || ""
        ],
        error => {
            if (error) console.error("User audit log error:", error.message);
        }
    );
}

// ------------------------------------------------------------
// GET PERMISSION LIST
// ------------------------------------------------------------
router.get("/permissions", requireUserManagement, (req, res) => {
    res.json({
        success: true,
        permissions: PERMISSIONS.map(([key, label]) => ({ key, label }))
    });
});

// ------------------------------------------------------------
// GET ALL USERS
// ------------------------------------------------------------
router.get("/", requireUserManagement, (req, res) => {
    db.all(
        `SELECT id, username, full_name, email, role, is_active, created_at FROM users ORDER BY id ASC`,
        [],
        (error, rows) => {
            if (error) {
                console.error("Users list error:", error.message);
                return res.status(500).json({ success: false, message: "Unable to load users." });
            }
            res.json({ success: true, users: rows.map(safeUser) });
        }
    );
});

// ------------------------------------------------------------
// CREATE USER
// ------------------------------------------------------------
router.post("/", requireUserManagement, async (req, res) => {
    try {
        const fullName = String(req.body.full_name || "").trim();
        const username = String(req.body.username || "").trim();
        const email = String(req.body.email || "").trim();
        const password = String(req.body.password || "");
        const role = String(req.body.role || "Viewer").trim();
        const permissions = Array.isArray(req.body.permissions) ? req.body.permissions : [];

        if (!fullName || !username || !password) {
            return res.status(400).json({ success: false, message: "Full Name, Username and Password are required." });
        }
        if (!/^[a-zA-Z0-9._-]{3,40}$/.test(username)) {
            return res.status(400).json({ success: false, message: "Username may contain letters, numbers, dot, underscore and hyphen only." });
        }
        if (password.length < 8) {
            return res.status(400).json({ success: false, message: "Password must be at least 8 characters long." });
        }
        if (!["Admin", "IT Support", "Asset Manager", "Viewer"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role selected." });
        }

        const cleanedPermissions = [...new Set(permissions.filter(p => PERMISSION_KEYS.has(p)))];
        const finalPermissions = role === "Admin" ? [...PERMISSION_KEYS] : cleanedPermissions;
        const passwordHash = await hashPassword(password);

        db.run("BEGIN IMMEDIATE TRANSACTION", beginError => {
            if (beginError) {
                console.error("Create user transaction error:", beginError.message);
                return res.status(500).json({ success: false, message: "Unable to start user creation." });
            }

            db.run(
                `INSERT INTO users (username, password_hash, full_name, email, role, is_active)
                 VALUES (?, ?, ?, ?, ?, 1)`,
                [username, passwordHash, fullName, email, role],
                function (error) {
                    if (error) {
                        db.run("ROLLBACK");
                        if (String(error.message).includes("UNIQUE")) {
                            return res.status(409).json({ success: false, message: "Username already exists." });
                        }
                        console.error("Create user error:", error.message);
                        return res.status(500).json({ success: false, message: "Unable to create user." });
                    }

                    const userId = this.lastID;

                    const insertPermission = index => {
                        if (index >= finalPermissions.length) {
                            return db.run("COMMIT", commitError => {
                                if (commitError) {
                                    db.run("ROLLBACK");
                                    console.error("Create user commit error:", commitError.message);
                                    return res.status(500).json({ success: false, message: "Unable to save user." });
                                }
                                writeAudit(req, "User Created", `Created user ${username} (${role})`, userId);
                                return res.json({ success: true, message: "User created successfully.", user_id: userId });
                            });
                        }

                        db.run(
                            `INSERT OR REPLACE INTO user_permissions (user_id, permission_key, enabled) VALUES (?, ?, 1)`,
                            [userId, finalPermissions[index]],
                            permissionError => {
                                if (permissionError) {
                                    db.run("ROLLBACK");
                                    console.error("Create permission error:", permissionError.message);
                                    return res.status(500).json({ success: false, message: "Unable to save user permissions. No user was created." });
                                }
                                insertPermission(index + 1);
                            }
                        );
                    };

                    insertPermission(0);
                }
            );
        });
    } catch (error) {
        console.error("Create user exception:", error);
        res.status(500).json({ success: false, message: "Unable to create user." });
    }
});

// ------------------------------------------------------------
// GET ONE USER PERMISSIONS
// ------------------------------------------------------------
router.get("/:id/permissions", requireUserManagement, (req, res) => {
    const id = Number(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: "Invalid user." });

    db.all(
        `SELECT permission_key FROM user_permissions WHERE user_id = ? AND enabled = 1 ORDER BY permission_key`,
        [id],
        (error, rows) => {
            if (error) {
                console.error("User permissions error:", error.message);
                return res.status(500).json({ success: false, message: "Unable to load user permissions." });
            }
            res.json({ success: true, permissions: rows.map(row => row.permission_key) });
        }
    );
});


// ------------------------------------------------------------
// UPDATE USER
// ------------------------------------------------------------
router.put("/:id", requireUserManagement, async (req, res) => {
    try {
        const id = Number(req.params.id);
        const fullName = String(req.body.full_name || "").trim();
        const email = String(req.body.email || "").trim();
        const password = String(req.body.password || "");
        const role = String(req.body.role || "Viewer").trim();
        const permissions = Array.isArray(req.body.permissions)
            ? [...new Set(req.body.permissions.filter(p => PERMISSION_KEYS.has(p)))]
            : [];

        if (!id || !fullName) return res.status(400).json({ success: false, message: "Valid user and Full Name are required." });
        if (password && password.length < 8) {
            return res.status(400).json({ success: false, message: "New password must be at least 8 characters long." });
        }
        if (!["Admin", "IT Support", "Asset Manager", "Viewer"].includes(role)) {
            return res.status(400).json({ success: false, message: "Invalid role selected." });
        }

        const passwordHash = password ? await hashPassword(password) : null;
        db.get(`SELECT username FROM users WHERE id = ?`, [id], (findError, existing) => {
            if (findError || !existing) return res.status(404).json({ success: false, message: "User not found." });

            const finalPermissions = role === "Admin" ? [...PERMISSION_KEYS] : permissions;
            db.run("BEGIN IMMEDIATE TRANSACTION", beginError => {
                if (beginError) return res.status(500).json({ success: false, message: "Unable to start user update." });

                const updateSql = password
                    ? `UPDATE users SET full_name = ?, email = ?, role = ?, password_hash = ? WHERE id = ?`
                    : `UPDATE users SET full_name = ?, email = ?, role = ? WHERE id = ?`;
                const updateParams = password
                    ? [fullName, email, role, passwordHash, id]
                    : [fullName, email, role, id];

                db.run(updateSql, updateParams, updateError => {
                    if (updateError) {
                        db.run("ROLLBACK");
                        return res.status(500).json({ success: false, message: "Unable to update user." });
                    }

                    db.run(`DELETE FROM user_permissions WHERE user_id = ?`, [id], deleteError => {
                        if (deleteError) {
                            db.run("ROLLBACK");
                            return res.status(500).json({ success: false, message: "Unable to reset user permissions." });
                        }

                        const addPermission = index => {
                            if (index >= finalPermissions.length) {
                                return db.run("COMMIT", commitError => {
                                    if (commitError) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ success: false, message: "Unable to save user changes." });
                                    }
                                    writeAudit(req, "User Updated", `Updated user ${existing.username} (${role})`, id);
                                    if (password) writeAudit(req, "User Password Changed", `Changed password for user ${existing.username}`, id);
                                    return res.json({
                                        success: true,
                                        message: password ? "User details and password updated successfully." : "User updated successfully."
                                    });
                                });
                            }

                            db.run(
                                `INSERT OR REPLACE INTO user_permissions (user_id, permission_key, enabled) VALUES (?, ?, 1)`,
                                [id, finalPermissions[index]],
                                permissionError => {
                                    if (permissionError) {
                                        db.run("ROLLBACK");
                                        return res.status(500).json({ success: false, message: "Unable to save user permissions. Changes were rolled back." });
                                    }
                                    addPermission(index + 1);
                                }
                            );
                        };
                        addPermission(0);
                    });
                });
            });
        });
    } catch (error) {
        console.error("Update user exception:", error.message);
        res.status(500).json({ success: false, message: "Unable to update user." });
    }
});

// ------------------------------------------------------------
// ENABLE / DISABLE USER
// ------------------------------------------------------------
router.patch("/:id/status", requireUserManagement, (req, res) => {
    const id = Number(req.params.id);
    const isActive = req.body.is_active ? 1 : 0;

    if (!id) return res.status(400).json({ success: false, message: "Invalid user." });
    if (id === req.session.user.id && isActive === 0) {
        return res.status(400).json({ success: false, message: "You cannot disable your own account." });
    }

    db.get(`SELECT username FROM users WHERE id = ?`, [id], (findError, user) => {
        if (findError || !user) return res.status(404).json({ success: false, message: "User not found." });

        db.run(`UPDATE users SET is_active = ? WHERE id = ?`, [isActive, id], error => {
            if (error) return res.status(500).json({ success: false, message: "Unable to update user status." });
            writeAudit(req, isActive ? "User Enabled" : "User Disabled", `${isActive ? "Enabled" : "Disabled"} user ${user.username}`, id);
            res.json({ success: true, message: `User ${isActive ? "enabled" : "disabled"} successfully.` });
        });
    });
});


// Admin must verify an OTP sent to the signed-in admin's registered email before initiating a reset.
const nodemailer = require("nodemailer");
const adminResetOtps = new Map();
const adminResetTokens = new Map();
function userSmtpTransport() {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS || /example\.com|replace_with|your_smtp/i.test(`${process.env.SMTP_HOST} ${process.env.SMTP_USER} ${process.env.SMTP_PASS}`)) {
        throw new Error("ROF SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER and SMTP_PASS in the project .env file using values approved by ROF IT.");
    }
    return nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT || 587), secure: String(process.env.SMTP_SECURE || "false") === "true", auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } });
}
async function sendUserMail(to, subject, text, html) {
    await userSmtpTransport().sendMail({ from: process.env.SMTP_FROM || process.env.SMTP_USER, to, subject, text, html });
}
router.post("/:id/reset-password/request-otp", requireUserManagement, async (req, res) => {
    const targetId = Number(req.params.id); const adminId = Number(req.session.user.id);
    db.get(`SELECT id, username, email FROM users WHERE id = ?`, [adminId], async (adminError, admin) => {
        if (adminError || !admin || !admin.email || !String(admin.email).includes("@")) return res.status(400).json({ success: false, message: "Admin account has no valid registered email. Update it before resetting passwords." });
        db.get(`SELECT id, username, full_name, email FROM users WHERE id = ?`, [targetId], async (targetError, target) => {
            if (targetError || !target) return res.status(404).json({ success: false, message: "Target user not found." });
            if (!target.email || !String(target.email).includes("@")) return res.status(400).json({ success: false, message: "Target user has no valid registered email. Update the user's email first." });
            try {
                const otp = String(crypto.randomInt(100000, 1000000));
                adminResetOtps.set(`${adminId}:${targetId}`, { hash: crypto.createHash("sha256").update(otp).digest("hex"), expires: Date.now() + 5 * 60 * 1000, attempts: 0 });
                await sendUserMail(admin.email, "ROF Asset Management - Admin Verification OTP", `You requested a password reset for ${target.username}. OTP: ${otp}. Expires in 5 minutes.`, `<p>You requested a password reset for <b>${target.username}</b>.</p><h2>${otp}</h2><p>Expires in 5 minutes.</p>`);
                return res.json({ success: true, message: "Verification OTP sent to your registered admin email." });
            } catch (mailError) { adminResetOtps.delete(`${adminId}:${targetId}`); console.error("Admin OTP mail error:", mailError.message); return res.status(503).json({ success: false, message: "Could not send OTP. Check ROF SMTP configuration." }); }
        });
    });
});
router.post("/:id/reset-password/verify-otp", requireUserManagement, (req, res) => {
    const targetId = Number(req.params.id); const adminId = Number(req.session.user.id); const otp = String(req.body.otp || "").trim();
    const key = `${adminId}:${targetId}`; const rec = adminResetOtps.get(key);
    if (!/^\d{6}$/.test(otp) || !rec || rec.expires < Date.now() || rec.attempts >= 5) { adminResetOtps.delete(key); return res.status(400).json({ success: false, message: "OTP invalid or expired. Request a new OTP." }); }
    rec.attempts++;
    const submitted = crypto.createHash("sha256").update(otp).digest("hex");
    if (!crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(rec.hash))) return res.status(400).json({ success: false, message: "Incorrect OTP." });
    adminResetOtps.delete(key);
    db.get(`SELECT id, username, full_name, email FROM users WHERE id = ?`, [targetId], async (error, target) => {
        if (error || !target || !target.email) return res.status(400).json({ success: false, message: "User email is not configured." });
        const token = crypto.randomBytes(32).toString("hex"); adminResetTokens.set(token, { userId: targetId, expires: Date.now() + 15 * 60 * 1000 });
        const base = process.env.APP_BASE_URL || `${req.protocol}://${req.get("host")}`;
        const link = `${base}/forgot-password.html?token=${token}&mode=admin-reset`;
        try {
            await sendUserMail(target.email, "ROF Asset Management - Reset Your Password", `Hello ${target.full_name || target.username},\n\nAn administrator approved a password reset for your account. Use this link within 15 minutes:\n${link}\n\nIf you did not expect this, contact IT Support.`, `<p>Hello ${target.full_name || target.username},</p><p>An administrator approved a password reset for your account.</p><p><a href="${link}">Set a new password</a> (valid for 15 minutes)</p><p>If you did not expect this, contact IT Support.</p>`);
            writeAudit(req, "Password Reset Initiated", `Admin verified OTP and emailed a password reset link to ${target.username}`, targetId);
            return res.json({ success: true, message: "OTP verified. A secure reset link has been emailed to the employee." });
        } catch (mailError) { adminResetTokens.delete(token); console.error("Employee reset-link email error:", mailError.message); return res.status(503).json({ success: false, message: "Could not email reset link. Check SMTP configuration." }); }
    });
});
router.post("/complete-email-reset", async (req, res) => {
    const token = String(req.body.token || ""); const password = String(req.body.password || ""); const record = adminResetTokens.get(token);
    if (!record || record.expires < Date.now()) { adminResetTokens.delete(token); return res.status(400).json({ success: false, message: "Reset link expired. Ask IT Admin to initiate a new reset." }); }
    if (password.length < 10) return res.status(400).json({ success: false, message: "Password must be at least 10 characters long." });
    try {
        const hash = await hashPassword(password);
        db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [hash, record.userId], error => {
            if (error) return res.status(500).json({ success: false, message: "Unable to update password." });
            adminResetTokens.delete(token);
            db.get(`SELECT username FROM users WHERE id = ?`, [record.userId], (e, u) => { if (u) writeAudit(req, "Password Reset Completed", `Employee completed email password reset for ${u.username}`, record.userId); });
            return res.json({ success: true, message: "Password changed successfully. You can now sign in." });
        });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to update password." }); }
});


// ------------------------------------------------------------
// RESET USER PASSWORD BY ADMIN
// ------------------------------------------------------------
router.post("/:id/reset-password", requireUserManagement, (req, res) => {
    return res.status(410).json({ success: false, message: "Direct password entry is disabled. Use Reset Password → email OTP verification." });
});

module.exports = router;
