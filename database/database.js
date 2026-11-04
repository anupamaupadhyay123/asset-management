// ============================================================
// DATABASE
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================

const sqlite3 = require("sqlite3").verbose();
const path = require("path");


// ============================================================
// DATABASE PATH
// ============================================================

const databasePath =
    path.join(__dirname, "asset.db");


// ============================================================
// DATABASE CONNECTION
// ============================================================

const db =
    new sqlite3.Database(
        databasePath,
        (error) => {

            if (error) {

                console.error(
                    "Database connection failed:",
                    error.message
                );

            } else {

                console.log(
                    "SQLite database connected successfully."
                );

            }

        }
    );


// ============================================================
// DATABASE SETUP
// ============================================================

db.serialize(() => {


    // ========================================================
    // FOREIGN KEYS
    // ========================================================

    db.run(
        "PRAGMA foreign_keys = ON"
    );


    // ========================================================
    // ASSETS TABLE
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS assets (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            asset_id TEXT UNIQUE NOT NULL,

            asset_type TEXT NOT NULL,

            brand TEXT NOT NULL,

            model TEXT,

            serial_number TEXT UNIQUE NOT NULL,

            purchase_date TEXT,

            purchase_cost REAL DEFAULT 0,

            vendor TEXT,

            warranty_expiry TEXT,

            department TEXT,

            location TEXT NOT NULL,

            status TEXT DEFAULT 'Available',

            condition TEXT NOT NULL,

            remarks TEXT,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    // ========================================================
    // ASSET ASSIGNMENTS TABLE
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS asset_assignments (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            asset_id TEXT NOT NULL,

            employee_id TEXT NOT NULL,

            employee_name TEXT NOT NULL,

            employee_email TEXT NOT NULL,

            employee_mobile TEXT DEFAULT '',

            designation TEXT DEFAULT '',

            department TEXT DEFAULT '',

            location TEXT DEFAULT '',

            assignment_date TEXT NOT NULL,

            expected_return_date TEXT DEFAULT '',

            handover_condition TEXT NOT NULL,

            assignment_remarks TEXT DEFAULT '',

            returned_date TEXT,

            return_condition TEXT,

            return_remarks TEXT,

            status TEXT DEFAULT 'Assigned',

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (asset_id)
                REFERENCES assets(asset_id)

        )
    `);


    // ========================================================
    // ASSIGNMENT CONDITION DETAILS AND PHOTO EVIDENCE
    // ========================================================

    db.run(`CREATE TABLE IF NOT EXISTS assignment_condition_details (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        details_json TEXT DEFAULT '{}',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES asset_assignments(id) ON DELETE CASCADE
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS assignment_photos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        assignment_id INTEGER NOT NULL,
        photo_stage TEXT NOT NULL CHECK(photo_stage IN ('issue','return')),
        file_name TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        photo_data BLOB NOT NULL,
        uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assignment_id) REFERENCES asset_assignments(id) ON DELETE CASCADE
    )`);


    // ========================================================
    // REPAIR HISTORY
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS repair_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id TEXT NOT NULL,
            repair_date TEXT DEFAULT '',
            problem TEXT DEFAULT '',
            sent_to TEXT DEFAULT '',
            repair_status TEXT DEFAULT '',
            received_date TEXT DEFAULT '',
            repair_cost REAL DEFAULT 0,
            condition_after TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
        )
    `);


    // ========================================================
    // ACTIVITY HISTORY
    // ASSET LEVEL ACTIVITY
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS activity_history (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            asset_id TEXT,

            activity_type TEXT NOT NULL,

            description TEXT NOT NULL,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    // ========================================================
    // USERS TABLE
    // LOGIN / AUTHENTICATION
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS users (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            username TEXT UNIQUE NOT NULL,

            password_hash TEXT NOT NULL,

            full_name TEXT DEFAULT '',

            email TEXT DEFAULT '',

            role TEXT DEFAULT 'Admin',

            is_active INTEGER DEFAULT 1,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP

        )
    `);


    // ========================================================
    // USER PERMISSIONS
    // ========================================================
    // Individual access control for each user.
    // Admin users are treated as full-access users by middleware.
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS user_permissions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER NOT NULL,

            permission_key TEXT NOT NULL,

            enabled INTEGER DEFAULT 1,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            UNIQUE(user_id, permission_key),

            FOREIGN KEY (user_id)
                REFERENCES users(id)
                ON DELETE CASCADE

        )
    `);


    // ========================================================
    // USER ACTIVITY / AUDIT LOG
    // ========================================================
    // Is table mein record hoga:
    //
    // Login
    // Logout
    // Asset Added
    // Asset Updated
    // Asset Imported
    // Asset Assigned
    // Asset Returned
    // Report Exported
    //
    // Kis user ne action kiya
    // Kab kiya
    // Kis asset par kiya
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS user_activity_log (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            username TEXT DEFAULT '',

            full_name TEXT DEFAULT '',

            action_type TEXT NOT NULL,

            description TEXT DEFAULT '',

            asset_id TEXT DEFAULT '',

            ip_address TEXT DEFAULT '',

            user_agent TEXT DEFAULT '',

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)

        )
    `);


    // ========================================================
    // USER SESSION LOG
    // ========================================================
    // Login time
    // Logout time
    // Session duration
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS user_sessions (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            username TEXT DEFAULT '',

            login_time DATETIME DEFAULT CURRENT_TIMESTAMP,

            logout_time DATETIME,

            last_activity DATETIME DEFAULT CURRENT_TIMESTAMP,

            ip_address TEXT DEFAULT '',

            user_agent TEXT DEFAULT '',

            session_status TEXT DEFAULT 'Active',

            FOREIGN KEY (user_id)
                REFERENCES users(id)

        )
    `);


    // ========================================================
    // IMPORT HISTORY
    // ========================================================
    // Har Excel / CSV import ka record.
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS import_history (

            id INTEGER PRIMARY KEY AUTOINCREMENT,

            user_id INTEGER,

            username TEXT DEFAULT '',

            file_name TEXT DEFAULT '',

            total_rows INTEGER DEFAULT 0,

            imported_rows INTEGER DEFAULT 0,

            skipped_rows INTEGER DEFAULT 0,

            invalid_rows INTEGER DEFAULT 0,

            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,

            FOREIGN KEY (user_id)
                REFERENCES users(id)

        )
    `);


    // ========================================================
    // DATABASE MIGRATION
    // ========================================================
    // Existing database ka data delete nahi hoga.
    // Missing columns automatically add honge.
    // ========================================================


    // ========================================================
    // USERS TABLE MIGRATION
    // ========================================================

    db.all(
        `PRAGMA table_info(users)`,
        [],
        (error, columns) => {
            if (error) {
                console.error("Users schema check failed:", error.message);
                return;
            }

            const existingColumns = columns.map(column => column.name);

            if (!existingColumns.includes("email")) {
                db.run(`ALTER TABLE users ADD COLUMN email TEXT DEFAULT ''`);
            }
        }
    );


    // ========================================================
    // CHECK ASSET ASSIGNMENTS COLUMNS
    // ========================================================

    db.all(
        `PRAGMA table_info(asset_assignments)`,
        [],
        (error, columns) => {

            if (error) {

                console.error(
                    "Assignment schema check failed:",
                    error.message
                );

                return;

            }


            const existingColumns =
                columns.map(
                    column => column.name
                );


            // ------------------------------------------------
            // EMPLOYEE MOBILE
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "employee_mobile"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN employee_mobile TEXT DEFAULT ''
                `);

            }


            // ------------------------------------------------
            // DESIGNATION
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "designation"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN designation TEXT DEFAULT ''
                `);

            }


            // ------------------------------------------------
            // DEPARTMENT
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "department"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN department TEXT DEFAULT ''
                `);

            }


            // ------------------------------------------------
            // LOCATION
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "location"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN location TEXT DEFAULT ''
                `);

            }


            // ------------------------------------------------
            // EXPECTED RETURN DATE
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "expected_return_date"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN expected_return_date TEXT DEFAULT ''
                `);

            }


            // ------------------------------------------------
            // HANDOVER CONDITION
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "handover_condition"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN handover_condition TEXT DEFAULT 'New'
                `);

            }


            // ------------------------------------------------
            // ASSIGNMENT REMARKS
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "assignment_remarks"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN assignment_remarks TEXT DEFAULT ''
                `);

            }


            // ------------------------------------------------
            // RETURNED DATE
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "returned_date"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN returned_date TEXT
                `);

            }


            // ------------------------------------------------
            // RETURN CONDITION
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "return_condition"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN return_condition TEXT
                `);

            }


            // ------------------------------------------------
            // RETURN REMARKS
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "return_remarks"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN return_remarks TEXT
                `);

            }


            // ------------------------------------------------
            // STATUS
            // ------------------------------------------------

            if (
                !existingColumns.includes(
                    "status"
                )
            ) {

                db.run(`
                    ALTER TABLE asset_assignments
                    ADD COLUMN status TEXT DEFAULT 'Assigned'
                `);

            }


            console.log(
                "Assignment database migration checked."
            );

        }
    );


    // ========================================================
    // REPAIR HISTORY TABLE (SAFE MIGRATION)
    // ========================================================

    db.run(`
        CREATE TABLE IF NOT EXISTS repair_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            asset_id TEXT NOT NULL,
            repair_date TEXT DEFAULT '',
            problem TEXT DEFAULT '',
            sent_to TEXT DEFAULT '',
            repair_status TEXT DEFAULT '',
            received_date TEXT DEFAULT '',
            repair_cost REAL DEFAULT 0,
            condition_after TEXT DEFAULT '',
            remarks TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (asset_id) REFERENCES assets(asset_id)
        )
    `);

    // issued_by is required for a reliable issuance printout.
    db.all(`PRAGMA table_info(asset_assignments)`, [], (error, columns) => {
        if (error) return;
        const names = columns.map(c => c.name);
        if (!names.includes('issued_by')) {
            db.run(`ALTER TABLE asset_assignments ADD COLUMN issued_by TEXT DEFAULT ''`);
        }
        // These legacy columns make old databases and new databases interoperable.
        if (!names.includes('employee_department')) {
            db.run(`ALTER TABLE asset_assignments ADD COLUMN employee_department TEXT NOT NULL DEFAULT ''`);
        }
        if (!names.includes('employee_designation')) {
            db.run(`ALTER TABLE asset_assignments ADD COLUMN employee_designation TEXT NOT NULL DEFAULT ''`);
        }
        if (!names.includes('employee_location')) {
            db.run(`ALTER TABLE asset_assignments ADD COLUMN employee_location TEXT NOT NULL DEFAULT ''`);
        }
        if (!names.includes('assignment_status')) {
            db.run(`ALTER TABLE asset_assignments ADD COLUMN assignment_status TEXT DEFAULT 'Assigned'`);
        }
        if (!names.includes('remarks')) {
            db.run(`ALTER TABLE asset_assignments ADD COLUMN remarks TEXT DEFAULT ''`);
        }
    });

    // ========================================================
    // NORMALIZE ASSIGNMENT STATUS VALUES
    // ========================================================
    // Older database versions used both `status` and `assignment_status`.
    // Keep them synchronized so imported and manually assigned assets follow
    // the same lifecycle and remain returnable/printable.
    db.run(`
        UPDATE asset_assignments
        SET assignment_status = CASE
            WHEN returned_date IS NULL AND status = 'Assigned' THEN 'Active'
            WHEN returned_date IS NOT NULL THEN 'Returned'
            ELSE COALESCE(assignment_status, status, 'Returned')
        END
        WHERE assignment_status IS NULL
           OR assignment_status = ''
           OR (returned_date IS NOT NULL AND assignment_status <> 'Returned')
           OR (returned_date IS NULL AND status = 'Assigned' AND assignment_status <> 'Active')
    `);

    db.run(`
        UPDATE asset_assignments
        SET status = CASE
            WHEN returned_date IS NULL AND assignment_status = 'Active' THEN 'Assigned'
            WHEN returned_date IS NOT NULL OR assignment_status = 'Returned' THEN 'Returned'
            ELSE COALESCE(status, 'Assigned')
        END
        WHERE status IS NULL
           OR status = ''
           OR (assignment_status = 'Active' AND status <> 'Assigned')
           OR (assignment_status = 'Returned' AND status <> 'Returned')
           OR returned_date IS NOT NULL
    `);


    // ========================================================
    // ASSETS INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_assets_status
        ON assets(status)
    `);


    // ========================================================
    // ASSET ID INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_assets_asset_id
        ON assets(asset_id)
    `);


    // ========================================================
    // SERIAL NUMBER INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_assets_serial_number
        ON assets(serial_number)
    `);


    // ========================================================
    // ASSIGNMENT INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_assignments_asset
        ON asset_assignments(asset_id)
    `);


    // ========================================================
    // ASSIGNMENT STATUS INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_assignments_status
        ON asset_assignments(status)
    `);


    // ========================================================
    // ACTIVITY INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_activity_asset
        ON activity_history(asset_id)
    `);


    // ========================================================
    // ACTIVITY DATE INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_activity_created_at
        ON activity_history(created_at)
    `);


    // ========================================================
    // USERS SAFE MIGRATION
    // ========================================================

    db.all(
        `PRAGMA table_info(users)`,
        [],
        (error, columns) => {
            if (error) {
                console.error(
                    "Users schema check failed:",
                    error.message
                );
                return;
            }

            const names = columns.map(column => column.name);

            if (!names.includes("email")) {
                db.run(`
                    ALTER TABLE users
                    ADD COLUMN email TEXT DEFAULT ''
                `);
            }
        }
    );


    // ========================================================
    // USERNAME INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_users_username
        ON users(username)
    `);


    // ========================================================
    // USERS ACTIVE INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_users_active
        ON users(is_active)
    `);


    // ========================================================
    // USER PERMISSIONS SAFE MIGRATION
    // ========================================================
    // Older project versions may contain a legacy permission table
    // with columns such as permission / permission_name / key.
    // Rebuild it into one canonical schema so new users can always
    // save permissions without breaking existing permission data.
    // ========================================================

    db.all(
        `PRAGMA table_info(user_permissions)`,
        [],
        (error, columns) => {

            if (error) {
                console.error("User permissions schema check failed:", error.message);
                return;
            }

            const names = columns.map(column => column.name);
            const canonical = ["id", "user_id", "permission_key", "enabled", "created_at"];
            const legacyPermissionColumn = [
                "permission_key",
                "permission",
                "permission_name",
                "permission_code",
                "key"
            ].find(name => names.includes(name));

            const hasCanonical = canonical.every(name => names.includes(name));
            const hasExtraColumns = names.some(name => !canonical.includes(name));

            // If the table is already canonical, only make sure indexes exist.
            if (hasCanonical && !hasExtraColumns) {
                createPermissionIndexes();
                return;
            }

            const copyColumn = legacyPermissionColumn || "permission_key";

            db.serialize(() => {
                db.run("PRAGMA foreign_keys = OFF");
                db.run("BEGIN IMMEDIATE TRANSACTION", beginError => {
                    if (beginError) {
                        console.error("Unable to start permission migration:", beginError.message);
                        db.run("PRAGMA foreign_keys = ON");
                        return;
                    }

                    db.run(`ALTER TABLE user_permissions RENAME TO user_permissions_legacy`, renameError => {
                        if (renameError) {
                            console.error("Unable to prepare permission migration:", renameError.message);
                            db.run("ROLLBACK");
                            db.run("PRAGMA foreign_keys = ON");
                            return;
                        }

                        db.run(`
                            CREATE TABLE user_permissions (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                user_id INTEGER NOT NULL,
                                permission_key TEXT NOT NULL,
                                enabled INTEGER DEFAULT 1,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                UNIQUE(user_id, permission_key),
                                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
                            )
                        `, createError => {
                            if (createError) {
                                console.error("Unable to create canonical permissions table:", createError.message);
                                db.run("ROLLBACK");
                                db.run("PRAGMA foreign_keys = ON");
                                return;
                            }

                            const sourceColumn = names.includes(copyColumn) ? copyColumn : "NULL";
                            const enabledColumn = names.includes("enabled") ? "enabled" : "1";
                            const createdColumn = names.includes("created_at") ? "created_at" : "CURRENT_TIMESTAMP";

                            db.run(`
                                INSERT OR IGNORE INTO user_permissions
                                (user_id, permission_key, enabled, created_at)
                                SELECT user_id,
                                       TRIM(COALESCE(${sourceColumn}, '')),
                                       COALESCE(${enabledColumn}, 1),
                                       COALESCE(${createdColumn}, CURRENT_TIMESTAMP)
                                FROM user_permissions_legacy
                                WHERE user_id IS NOT NULL
                                  AND TRIM(COALESCE(${sourceColumn}, '')) <> ''
                            `, copyError => {
                                if (copyError) {
                                    console.error("Unable to migrate permission data:", copyError.message);
                                    db.run("ROLLBACK");
                                    db.run("PRAGMA foreign_keys = ON");
                                    return;
                                }

                                db.run("DROP TABLE user_permissions_legacy", dropError => {
                                    if (dropError) {
                                        console.error("Unable to remove legacy permission table:", dropError.message);
                                        db.run("ROLLBACK");
                                        db.run("PRAGMA foreign_keys = ON");
                                        return;
                                    }

                                    db.run("COMMIT", commitError => {
                                        if (commitError) {
                                            console.error("Unable to complete permission migration:", commitError.message);
                                            db.run("ROLLBACK");
                                        }
                                        db.run("PRAGMA foreign_keys = ON");
                                        createPermissionIndexes();
                                    });
                                });
                            });
                        });
                    });
                });
            });

            function createPermissionIndexes() {
                db.run(`CREATE INDEX IF NOT EXISTS idx_user_permissions_user ON user_permissions(user_id)`);
                db.run(`CREATE INDEX IF NOT EXISTS idx_user_permissions_key ON user_permissions(permission_key)`);
                console.log("User permissions database migration checked.");
            }
        }
    );


    // ========================================================
    // USER ACTIVITY INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_user
        ON user_activity_log(user_id)
    `);


    db.run(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_asset
        ON user_activity_log(asset_id)
    `);


    db.run(`
        CREATE INDEX IF NOT EXISTS idx_user_activity_date
        ON user_activity_log(created_at)
    `);


    // ========================================================
    // SESSION INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_sessions_user
        ON user_sessions(user_id)
    `);


    db.run(`
        CREATE INDEX IF NOT EXISTS idx_sessions_login
        ON user_sessions(login_time)
    `);


    // ========================================================
    // IMPORT HISTORY INDEX
    // ========================================================

    db.run(`
        CREATE INDEX IF NOT EXISTS idx_import_history_user
        ON import_history(user_id)
    `);


    db.run(`
        CREATE INDEX IF NOT EXISTS idx_import_history_date
        ON import_history(created_at)
    `);


    console.log(
        "Database setup completed."
    );

});


// ============================================================
// EXPORT DATABASE
// ============================================================

module.exports = db;