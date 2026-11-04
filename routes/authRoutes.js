// ============================================================
// AUTH ROUTES
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================

const express = require("express");
const crypto = require("crypto");

const router = express.Router();

const db = require("../database/database");

function writeAuthAudit(req, user, action, description, callback = () => {}) {
    db.run(
        `INSERT INTO user_activity_log (user_id, username, full_name, action_type, description, asset_id, ip_address, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [user?.id || null, user?.username || "", user?.full_name || "", action, description, "", req.ip || "", req.get("user-agent") || ""],
        error => {
            if (error) console.error("Authentication audit log error:", error.message);
            callback();
        }
    );
}


// ============================================================
// PASSWORD HASH
// ============================================================

function hashPassword(password) {

    return new Promise(
        (resolve, reject) => {

            const salt =
                crypto.randomBytes(16).toString("hex");


            crypto.scrypt(
                password,
                salt,
                64,
                (error, derivedKey) => {

                    if (error) {

                        return reject(error);

                    }


                    resolve(
                        `${salt}:${derivedKey.toString("hex")}`
                    );

                }
            );

        }
    );

}


// ============================================================
// PASSWORD VERIFY
// ============================================================

function verifyPassword(
    password,
    storedHash
) {

    return new Promise(
        (resolve, reject) => {

            if (
                !storedHash ||
                !storedHash.includes(":")
            ) {

                return resolve(false);

            }


            const parts =
                storedHash.split(":");


            const salt =
                parts[0];


            const storedKey =
                parts[1];


            if (
                !salt ||
                !storedKey
            ) {

                return resolve(false);

            }


            crypto.scrypt(
                password,
                salt,
                64,
                (error, derivedKey) => {

                    if (error) {

                        return reject(error);

                    }


                    const derivedBuffer =
                        Buffer.from(derivedKey);


                    const storedBuffer =
                        Buffer.from(
                            storedKey,
                            "hex"
                        );


                    if (
                        derivedBuffer.length !==
                        storedBuffer.length
                    ) {

                        return resolve(false);

                    }


                    resolve(
                        crypto.timingSafeEqual(
                            derivedBuffer,
                            storedBuffer
                        )
                    );

                }
            );

        }
    );

}


// ============================================================
// CREATE DEFAULT ADMIN
// ============================================================

async function createDefaultAdmin() {

    try {

        db.get(
            `
            SELECT id
            FROM users
            WHERE username = ?
            LIMIT 1
            `,
            ["admin"],
            async (
                error,
                user
            ) => {

                if (error) {

                    console.error(
                        "Admin check error:",
                        error.message
                    );

                    return;

                }


                if (user) {

                    console.log(
                        "Admin user already exists."
                    );

                    return;

                }


                const password =
                    "admin123";


                const passwordHash =
                    await hashPassword(
                        password
                    );


                db.run(
                    `
                    INSERT INTO users (
                        username,
                        password_hash,
                        full_name,
                        role,
                        is_active
                    )
                    VALUES (?, ?, ?, ?, ?)
                    `,
                    [
                        "admin",
                        passwordHash,
                        "IT Admin",
                        "Admin",
                        1
                    ],
                    function (
                        insertError
                    ) {

                        if (insertError) {

                            console.error(
                                "Admin creation error:",
                                insertError.message
                            );

                            return;

                        }


                        console.log(
                            "Default admin user created."
                        );

                        console.log(
                            "Username: admin"
                        );

                        console.log(
                            "Password: admin123"
                        );

                    }
                );

            }
        );

    }

    catch (error) {

        console.error(
            "Default admin setup error:",
            error.message
        );

    }

}


createDefaultAdmin();


// ============================================================
// LOGIN
// ============================================================

router.post("/login", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        const password = String(req.body.password || "");

        if (!username || !password) {
            return res.status(400).json({ success: false, message: "Username and password are required." });
        }

        db.get(
            `SELECT id, username, password_hash, full_name, email, role, is_active
             FROM users WHERE username = ? LIMIT 1`,
            [username],
            async (error, user) => {
                if (error) {
                    console.error("Login database error:", error.message);
                    return res.status(500).json({ success: false, message: "Unable to login." });
                }

                if (!user) {
                    return res.status(401).json({ success: false, message: "Invalid username or password." });
                }

                if (Number(user.is_active) !== 1) {
                    return res.status(403).json({ success: false, message: "This account is disabled." });
                }

                const validPassword = await verifyPassword(password, user.password_hash);
                if (!validPassword) {
                    return res.status(401).json({ success: false, message: "Invalid username or password." });
                }

                db.all(
                    `SELECT permission_key FROM user_permissions WHERE user_id = ? AND enabled = 1`,
                    [user.id],
                    (permissionError, permissionRows) => {
                        if (permissionError) {
                            console.error("Login permission load error:", permissionError.message);
                            return res.status(500).json({ success: false, message: "Unable to load user permissions." });
                        }

                        req.session.regenerate(sessionError => {
                            if (sessionError) {
                                console.error("Session regeneration error:", sessionError.message);
                                return res.status(500).json({ success: false, message: "Unable to create login session." });
                            }

                            req.session.user = {
                                id: user.id,
                                username: user.username,
                                full_name: user.full_name || "",
                                email: user.email || "",
                                role: user.role || "Viewer",
                                permissions: permissionRows.map(row => row.permission_key).filter(Boolean)
                            };

                            req.session.save(saveError => {
                                if (saveError) {
                                    console.error("Session save error:", saveError.message);
                                    return res.status(500).json({ success: false, message: "Unable to save login session." });
                                }

                                const loggedInUser = req.session.user;
                                db.run(
                                    `INSERT INTO user_sessions (user_id, username, login_time, last_activity, ip_address, user_agent, session_status) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, ?, ?, 'Active')`,
                                    [user.id, user.username || "", req.ip || "", req.get("user-agent") || ""],
                                    sessionInsertError => {
                                        if (sessionInsertError) console.error("Login session history error:", sessionInsertError.message);
                                        writeAuthAudit(req, loggedInUser, "Login", "Successful login", () => {
                                            return res.json({
                                                success: true,
                                                authenticated: true,
                                                message: "Login successful.",
                                                user: loggedInUser
                                            });
                                        });
                                    }
                                );
                            });
                        });
                    }
                );
            }
        );
    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({ success: false, message: "Unable to login." });
    }
});


// ============================================================
// CURRENT USER
// ============================================================
router.get("/me", (req, res) => {
    if (!req.session?.user) {
        return res.status(401).json({ success: false, authenticated: false, message: "Not logged in." });
    }

    const userId = req.session.user.id;
    db.get(
        `SELECT id, username, full_name, email, role, is_active FROM users WHERE id = ? LIMIT 1`,
        [userId],
        (error, user) => {
            if (error || !user || Number(user.is_active) !== 1) {
                req.session.destroy(() => {});
                return res.status(401).json({ success: false, authenticated: false, message: "Session is no longer valid." });
            }

            db.all(
                `SELECT permission_key FROM user_permissions WHERE user_id = ? AND enabled = 1`,
                [userId],
                (permissionError, rows) => {
                    if (permissionError) {
                        console.error("Current user permission error:", permissionError.message);
                        return res.status(500).json({ success: false, message: "Unable to load user permissions." });
                    }

                    const permissions = rows.map(row => row.permission_key).filter(Boolean);
                    const responseUser = {
                        id: user.id,
                        username: user.username,
                        full_name: user.full_name || "",
                        email: user.email || "",
                        role: user.role || "Viewer",
                        permissions
                    };

                    req.session.user = responseUser;
                    res.json({ success: true, authenticated: true, user: responseUser });
                }
            );
        }
    );
});


// ============================================================
// CHANGE PASSWORD
// ============================================================

router.post(
    "/change-password",
    async (req, res) => {

        try {

            // ------------------------------------------------
            // CHECK LOGIN
            // ------------------------------------------------

            if (
                !req.session ||
                !req.session.user
            ) {

                return res.status(401).json({

                    success: false,

                    message:
                        "You must be logged in to change your password."

                });

            }


            const {
                currentPassword,
                newPassword,
                confirmPassword
            } = req.body;


            // ------------------------------------------------
            // VALIDATION
            // ------------------------------------------------

            if (
                !currentPassword ||
                !newPassword ||
                !confirmPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "All password fields are required."

                });

            }


            // ------------------------------------------------
            // CONFIRM NEW PASSWORD
            // ------------------------------------------------

            if (
                newPassword !==
                confirmPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password and confirmation do not match."

                });

            }


            // ------------------------------------------------
            // PASSWORD LENGTH
            // ------------------------------------------------

            if (
                newPassword.length < 8
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be at least 8 characters."

                });

            }


            // ------------------------------------------------
            // PREVENT SAME PASSWORD
            // ------------------------------------------------

            if (
                currentPassword ===
                newPassword
            ) {

                return res.status(400).json({

                    success: false,

                    message:
                        "New password must be different from the current password."

                });

            }


            // ------------------------------------------------
            // GET CURRENT USER
            // ------------------------------------------------

            db.get(
                `
                SELECT
                    id,
                    password_hash
                FROM users
                WHERE id = ?
                LIMIT 1
                `,
                [
                    req.session.user.id
                ],
                async (
                    error,
                    user
                ) => {

                    if (error) {

                        console.error(
                            "Password lookup error:",
                            error.message
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Unable to change password."

                        });

                    }


                    if (!user) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "User account not found."

                        });

                    }


                    // ------------------------------------------------
                    // VERIFY CURRENT PASSWORD
                    // ------------------------------------------------

                    const validPassword =
                        await verifyPassword(
                            currentPassword,
                            user.password_hash
                        );


                    if (!validPassword) {

                        return res.status(401).json({

                            success: false,

                            message:
                                "Current password is incorrect."

                        });

                    }


                    // ------------------------------------------------
                    // HASH NEW PASSWORD
                    // ------------------------------------------------

                    const newPasswordHash =
                        await hashPassword(
                            newPassword
                        );


                    // ------------------------------------------------
                    // UPDATE DATABASE
                    // ------------------------------------------------

                    db.run(
                        `
                        UPDATE users
                        SET password_hash = ?
                        WHERE id = ?
                        `,
                        [
                            newPasswordHash,
                            user.id
                        ],
                        function (
                            updateError
                        ) {

                            if (updateError) {

                                console.error(
                                    "Password update error:",
                                    updateError.message
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Unable to update password."

                                });

                            }


                            if (
                                this.changes === 0
                            ) {

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        "Password was not updated."

                                });

                            }


                            return res.json({

                                success: true,

                                message:
                                    "Password changed successfully."

                            });

                        }
                    );

                }
            );

        }

        catch (error) {

            console.error(
                "Change password error:",
                error
            );

            return res.status(500).json({

                success: false,

                message:
                    "Unable to change password."

            });

        }

    }
);


// ============================================================
// LOGOUT
// ============================================================

router.post(
    "/logout",
    (req, res) => {

        if (!req.session) {

            return res.json({

                success: true,

                authenticated: false,

                message:
                    "Logged out successfully."

            });

        }


        const loggingOutUser = req.session.user || null;
        const finishLogout = () => req.session.destroy(
            (error) => {

                if (error) {

                    console.error(
                        "Logout error:",
                        error.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to logout."

                    });

                }


                res.clearCookie(
                    "connect.sid"
                );


                return res.json({

                    success: true,

                    authenticated: false,

                    message:
                        "Logged out successfully."

                });

            }
        );

        if (loggingOutUser) {
            db.run(
                `UPDATE user_sessions SET logout_time=CURRENT_TIMESTAMP, last_activity=CURRENT_TIMESTAMP, session_status='Logged Out' WHERE id=(SELECT id FROM user_sessions WHERE user_id=? AND session_status='Active' ORDER BY id DESC LIMIT 1)`,
                [loggingOutUser.id],
                sessionUpdateError => {
                    if (sessionUpdateError) console.error("Logout session history error:", sessionUpdateError.message);
                    writeAuthAudit(req, loggingOutUser, "Logout", "User logged out", finishLogout);
                }
            );
        } else {
            finishLogout();
        }

    }
);



// ============================================================
// EMAIL OTP + SECURE PASSWORD RECOVERY
// Configure SMTP_* values in .env before using these endpoints.
// ============================================================
const nodemailer = require("nodemailer");
const recoveryOtps = new Map();
const recoveryTokens = new Map();

function smtpTransport() {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!host || !user || !pass || /example\.com|replace_with|your_smtp/i.test(`${host} ${user} ${pass}`)) {
        throw new Error("ROF SMTP configuration is incomplete. Set SMTP_HOST, SMTP_USER and SMTP_PASS in the project .env file using values approved by ROF IT.");
    }
    return nodemailer.createTransport({
        host,
        port: Number(process.env.SMTP_PORT || 587),
        secure: String(process.env.SMTP_SECURE || "false") === "true",
        auth: { user, pass }
    });
}
async function sendRofMail(to, subject, text, html) {
    const transport = smtpTransport();
    await transport.sendMail({
        from: process.env.SMTP_FROM || process.env.SMTP_USER,
        to, subject, text, html
    });
}
function newOtp() { return String(crypto.randomInt(100000, 1000000)); }

// User self-service: identify account by username, then send OTP to its registered email.
router.post("/forgot-password/request-otp", async (req, res) => {
    try {
        const username = String(req.body.username || "").trim();
        if (!username) return res.status(400).json({ success: false, message: "Enter your username." });
        db.get(`SELECT id, username, email, is_active FROM users WHERE username = ? LIMIT 1`, [username], async (error, user) => {
            if (error) return res.status(500).json({ success: false, message: "Unable to process recovery." });
            if (!user || Number(user.is_active) !== 1 || !user.email || !String(user.email).includes("@")) {
                return res.status(400).json({ success: false, message: "No valid registered email is available for this account. Contact IT Admin." });
            }
            try {
                const otp = newOtp();
                recoveryOtps.set(`self:${user.id}`, { otpHash: crypto.createHash("sha256").update(otp).digest("hex"), expires: Date.now() + 5 * 60 * 1000, attempts: 0 });
                await sendRofMail(user.email, "ROF Asset Management - Password Reset OTP", `Hello ${user.full_name || user.username},\n\nYour password reset OTP is ${otp}. It expires in 5 minutes. If you did not request this, ignore this email.`, `<p>Hello ${user.full_name || user.username},</p><p>Your ROF Asset Management password reset OTP is:</p><h2 style="letter-spacing:5px">${otp}</h2><p>It expires in 5 minutes. If you did not request this, ignore this email.</p>`);
                return res.json({ success: true, message: "OTP sent to the registered email address. Check your inbox." });
            } catch (mailError) {
                recoveryOtps.delete(`self:${user.id}`);
                console.error("Password recovery email error:", mailError.message);
                return res.status(503).json({ success: false, message: "Email could not be sent. Contact IT Admin to verify SMTP configuration." });
            }
        });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to start password recovery." }); }
});

router.post("/forgot-password/verify-otp", async (req, res) => {
    const username = String(req.body.username || "").trim();
    const otp = String(req.body.otp || "").trim();
    if (!username || !/^\d{6}$/.test(otp)) return res.status(400).json({ success: false, message: "Enter username and 6-digit OTP." });
    db.get(`SELECT id FROM users WHERE username = ? LIMIT 1`, [username], (error, user) => {
        if (error || !user) return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        const key = `self:${user.id}`; const record = recoveryOtps.get(key);
        if (!record || record.expires < Date.now() || record.attempts >= 5) { recoveryOtps.delete(key); return res.status(400).json({ success: false, message: "OTP expired. Request a new OTP." }); }
        record.attempts++;
        const submitted = crypto.createHash("sha256").update(otp).digest("hex");
        if (!crypto.timingSafeEqual(Buffer.from(submitted), Buffer.from(record.otpHash))) return res.status(400).json({ success: false, message: "Incorrect OTP." });
        recoveryOtps.delete(key);
        const token = crypto.randomBytes(32).toString("hex");
        recoveryTokens.set(token, { userId: user.id, expires: Date.now() + 10 * 60 * 1000 });
        return res.json({ success: true, resetToken: token, message: "OTP verified. Set your new password." });
    });
});

router.post("/forgot-password/reset", async (req, res) => {
    const token = String(req.body.token || ""); const password = String(req.body.password || "");
    if (password.length < 10) return res.status(400).json({ success: false, message: "Password must be at least 10 characters long." });
    const record = recoveryTokens.get(token);
    if (!record || record.expires < Date.now()) { recoveryTokens.delete(token); return res.status(400).json({ success: false, message: "Reset session expired. Start again." }); }
    try {
        const passwordHash = await hashPassword(password);
        db.run(`UPDATE users SET password_hash = ? WHERE id = ?`, [passwordHash, record.userId], async error => {
            if (error) return res.status(500).json({ success: false, message: "Unable to update password." });
            recoveryTokens.delete(token);
            return res.json({ success: true, message: "Password changed successfully. Please sign in." });
        });
    } catch (error) { return res.status(500).json({ success: false, message: "Unable to update password." }); }
});


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;