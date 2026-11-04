const express = require("express");

const router = express.Router();

const db = require("../database/database");


// ============================================================
// ASSIGNMENT ROUTES
// ROF ASSET MANAGEMENT SYSTEM
// ============================================================


// ============================================================
// GET EXISTING ASSIGNMENT TABLE COLUMNS
// ============================================================

function getAssignmentColumns(callback) {

    db.all(
        `
        PRAGMA table_info(asset_assignments)
        `,
        [],
        (error, columns) => {

            if (error) {

                console.error(
                    "Assignment schema error:",
                    error.message
                );

                return callback(
                    error,
                    null
                );

            }


            const columnNames =
                columns.map(
                    column => column.name
                );


            callback(
                null,
                columnNames
            );

        }
    );

}


// ============================================================
// ASSIGN ASSET
// ============================================================

router.post("/", (req, res) => {

    const {

        asset_id,

        employee_id,

        employee_name,

        employee_email,

        employee_mobile,

        // New frontend names
        department,
        designation,
        location,

        // Old database compatible names
        employee_department,
        employee_designation,
        employee_location,

        assignment_date,

        expected_return_date,

        handover_condition,

        assignment_remarks,

        remarks,
        issued_by

    } = req.body;


    // ========================================================
    // NORMALIZE VALUES
    // ========================================================

    const finalDepartment =
        employee_department ||
        department ||
        "";

    const finalDesignation =
        employee_designation ||
        designation ||
        "";

    const finalLocation =
        employee_location ||
        location ||
        "";

    const finalRemarks =
        assignment_remarks ||
        remarks ||
        "";


    // ========================================================
    // REQUIRED FIELDS
    // ========================================================

    if (
        !asset_id ||
        !employee_id ||
        !employee_name ||
        !employee_email ||
        !finalDepartment ||
        !finalDesignation ||
        !finalLocation ||
        !assignment_date ||
        !handover_condition
    ) {

        return res.status(400).json({

            success: false,

            message:
                "Please fill all required assignment details."

        });

    }


    // ========================================================
    // CHECK DATABASE SCHEMA
    // ========================================================

    getAssignmentColumns(
        (schemaError, columns) => {

            if (schemaError) {

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to check assignment database."

                });

            }


            // ==================================================
            // DETECT OLD / CURRENT DATABASE SCHEMA
            // ==================================================

            const usesOldSchema =
                columns.includes(
                    "employee_department"
                );


            const departmentColumn =
                usesOldSchema
                    ? "employee_department"
                    : "department";


            const designationColumn =
                usesOldSchema
                    ? "employee_designation"
                    : "designation";


            const locationColumn =
                usesOldSchema
                    ? "employee_location"
                    : "location";


            const remarksColumn =
                usesOldSchema
                    ? "remarks"
                    : "assignment_remarks";


            const statusColumn =
                columns.includes(
                    "assignment_status"
                )
                    ? "assignment_status"
                    : "status";


            // ==================================================
            // CHECK ASSET
            // ==================================================

            db.get(

                `
                SELECT *
                FROM assets
                WHERE asset_id = ?
                LIMIT 1
                `,

                [asset_id],

                (assetError, asset) => {

                    if (assetError) {

                        console.error(
                            "Asset lookup error:",
                            assetError.message
                        );

                        return res.status(500).json({

                            success: false,

                            message:
                                "Unable to find asset."

                        });

                    }


                    if (!asset) {

                        return res.status(404).json({

                            success: false,

                            message:
                                "Asset not found."

                        });

                    }


                    // ==================================================
                    // ASSET MUST BE AVAILABLE
                    // ==================================================

                    if (
                        asset.status !==
                        "Available"
                    ) {

                        return res.status(409).json({

                            success: false,

                            message:
                                `Asset is currently ${asset.status}.`

                        });

                    }


                    // ==================================================
                    // BUILD INSERT QUERY
                    // ==================================================

                    const insertQuery = `

                        INSERT INTO asset_assignments (

                            asset_id,

                            employee_id,

                            employee_name,

                            employee_email,

                            employee_mobile,

                            ${departmentColumn},

                            ${designationColumn},

                            ${locationColumn},

                            assignment_date,

                            expected_return_date,

                            handover_condition,

                            ${remarksColumn},

                            ${statusColumn},

                            issued_by

                        )

                        VALUES (

                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?,
                            ?

                        )

                    `;


                    const values = [

                        asset_id,

                        employee_id,

                        employee_name,

                        employee_email,

                        employee_mobile ||
                        "",

                        finalDepartment,

                        finalDesignation,

                        finalLocation,

                        assignment_date,

                        expected_return_date ||
                        "",

                        handover_condition,

                        finalRemarks,

                        "Active",

                        issued_by || (req.session?.user && (req.session.user.full_name || req.session.user.name || req.session.user.username)) || "Admin"

                    ];


                    // ==================================================
                    // INSERT ASSIGNMENT
                    // ==================================================

                    db.run(

                        insertQuery,

                        values,

                        function (insertError) {

                            if (insertError) {

                                console.error(
                                    "Assignment insert error:",
                                    insertError.message
                                );

                                return res.status(500).json({

                                    success: false,

                                    message:
                                        insertError.message

                                });

                            }


                            const assignmentId =
                                this.lastID;

                            const conditionDetails = req.body.condition_details || {};
                            db.run(
                                `INSERT INTO assignment_condition_details (assignment_id, details_json) VALUES (?, ?)`,
                                [assignmentId, JSON.stringify(conditionDetails)],
                                (detailError) => {
                                    if (detailError) console.error("Condition detail save warning:", detailError.message);
                                }
                            );


                            // ==================================================
                            // UPDATE ASSET STATUS
                            // ==================================================

                            db.run(

                                `
                                UPDATE assets

                                SET status = 'Assigned'

                                WHERE asset_id = ?

                                `,

                                [asset_id],

                                (assetUpdateError) => {

                                    if (
                                        assetUpdateError
                                    ) {

                                        console.error(
                                            "Asset status update error:",
                                            assetUpdateError.message
                                        );

                                        return res.status(500).json({

                                            success: false,

                                            message:
                                                "Assignment saved but asset status could not be updated."

                                        });

                                    }


                                    // ==================================================
                                    // ACTIVITY HISTORY
                                    // ==================================================

                                    db.run(

                                        `
                                        INSERT INTO activity_history (

                                            asset_id,

                                            activity_type,

                                            description

                                        )

                                        VALUES (?, ?, ?)

                                        `,

                                        [

                                            asset_id,

                                            "Asset Assigned",

                                            `${asset_id} assigned to ${employee_name}`

                                        ],

                                        (activityError) => {

                                            if (
                                                activityError
                                            ) {

                                                console.error(
                                                    "Activity history error:",
                                                    activityError.message
                                                );

                                            }


                                            // ==========================================
                                            // SUCCESS
                                            // ==========================================

                                            return res.json({

                                                success: true,

                                                message:
                                                    "Asset assigned successfully.",

                                                assignment_id:
                                                    assignmentId

                                            });

                                        }

                                    );

                                }

                            );

                        }

                    );

                }

            );

        }

    );

});


// ============================================================
// RETURN ASSET
// ============================================================

router.post(
    "/return",
    (req, res) => {

        const {

            asset_id,

            returned_date,

            return_condition,

            return_remarks

        } = req.body;


        // ========================================================
        // REQUIRED FIELDS
        // ========================================================

        if (
            !asset_id ||
            !return_condition
        ) {

            return res.status(400).json({

                success: false,

                message:
                    "Please fill all required return fields."

            });

        }


        const returnDate =
            returned_date ||
            new Date()
                .toISOString()
                .split("T")[0];


        // ========================================================
        // CHECK DATABASE SCHEMA
        // ========================================================

        getAssignmentColumns(

            (schemaError, columns) => {

                if (schemaError) {

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to check assignment database."

                    });

                }


                const hasAssignmentStatus = columns.includes("assignment_status");

                const hasStatus = columns.includes("status");

                const hasReturnedDate = columns.includes("returned_date");

                const statusColumn = hasAssignmentStatus ? "assignment_status" : "status";

                // Support old/imported assignment records as well as new ones.
                // Never treat a record with a return date as current.
                const activeStatusParts = [];

                if (hasAssignmentStatus) {
                    activeStatusParts.push("assignment_status IN ('Active','Assigned','Issued')");
                }

                if (hasStatus) {
                    activeStatusParts.push("status IN ('Active','Assigned','Issued')");
                }

                const activeWhere = activeStatusParts.length
                    ? `${hasReturnedDate ? "returned_date IS NULL AND " : ""}(${activeStatusParts.join(" OR ")})`
                    : (hasReturnedDate ? "returned_date IS NULL" : "1=1");


                // ==================================================
                // FIND ACTIVE ASSIGNMENT
                // ==================================================

                db.get(

                    `
                    SELECT *

                    FROM asset_assignments

                    WHERE asset_id = ?

                    AND ${activeWhere}

                    ORDER BY id DESC

                    LIMIT 1

                    `,

                    [asset_id],

                    (findError, assignment) => {

                        if (findError) {

                            console.error(
                                "Assignment lookup error:",
                                findError.message
                            );

                            return res.status(500).json({

                                success: false,

                                message:
                                    "Unable to find active assignment."

                            });

                        }

                        processReturn(assignment);


                        // ==================================================
                        // PROCESS RETURN
                        // ==================================================

                        function processReturn(
                            currentAssignment
                        ) {

                            if (!currentAssignment) {

                                // Recovery path for legacy/imported assets that were
                                // marked Assigned but do not have an assignment row.
                                db.run(
                                    `UPDATE assets SET status = 'Available' WHERE asset_id = ? AND LOWER(status) IN ('assigned','active','issued')`,
                                    [asset_id],
                                    function (recoveryError) {
                                        if (recoveryError) {
                                            console.error("Legacy return recovery error:", recoveryError.message);
                                            return res.status(500).json({
                                                success: false,
                                                message: "No active assignment found and asset could not be recovered."
                                            });
                                        }

                                        if (this.changes === 0) {
                                            return res.status(404).json({
                                                success: false,
                                                message: "No active assignment found for this asset."
                                            });
                                        }

                                        db.run(
                                            `INSERT INTO activity_history (asset_id, activity_type, description) VALUES (?, ?, ?)`,
                                            [asset_id, "Asset Returned", `${asset_id} returned from legacy/imported assignment`],
                                            () => res.json({
                                                success: true,
                                                message: "Asset returned successfully."
                                            })
                                        );
                                    }
                                );

                                return;
                            }


                            // ==============================================
                            // UPDATE ASSIGNMENT
                            // ==============================================

                            db.run(

                                `
                                UPDATE asset_assignments

                                SET

                                    returned_date = ?,

                                    return_condition = ?,

                                    return_remarks = ?,

                                    ${statusColumn} = 'Returned'
                                    ${hasAssignmentStatus && hasStatus ? ", status = 'Returned'" : ""}

                                WHERE id = ?

                                `,

                                [

                                    returnDate,

                                    return_condition,

                                    return_remarks ||
                                    "",

                                    currentAssignment.id

                                ],

                                (updateError) => {

                                    if (
                                        updateError
                                    ) {

                                        console.error(
                                            "Return update error:",
                                            updateError.message
                                        );

                                        return res.status(500).json({

                                            success: false,

                                            message:
                                                "Unable to return asset."

                                        });

                                    }


                                    // ==========================================
                                    // MAKE ASSET AVAILABLE
                                    // ==========================================

                                    db.run(

                                        `
                                        UPDATE assets

                                        SET status = 'Available'

                                        WHERE asset_id = ?

                                        `,

                                        [asset_id],

                                        (assetError) => {

                                            if (
                                                assetError
                                            ) {

                                                console.error(
                                                    "Asset status error:",
                                                    assetError.message
                                                );

                                                return res.status(500).json({

                                                    success: false,

                                                    message:
                                                        "Return saved but asset status update failed."

                                                });

                                            }


                                            // ======================================
                                            // ACTIVITY
                                            // ======================================

                                            db.run(

                                                `
                                                INSERT INTO activity_history (

                                                    asset_id,

                                                    activity_type,

                                                    description

                                                )

                                                VALUES (?, ?, ?)

                                                `,

                                                [

                                                    asset_id,

                                                    "Asset Returned",

                                                    `${asset_id} returned by ${currentAssignment.employee_name}`

                                                ],

                                                () => {

                                                    return res.json({

                                                        success: true,

                                                        message:
                                                            "Asset returned successfully."

                                                    });

                                                }

                                            );

                                        }

                                    );

                                }

                            );

                        }

                    }

                );

            }

        );

    }

);


// ============================================================
// ASSIGNMENT CONDITION PHOTOS (ISSUE / RETURN)
// ============================================================

const multer = require("multer");
const photoUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 10 },
    fileFilter: (req, file, cb) => {
        if (/^image\/(jpeg|png|webp)$/.test(file.mimetype)) return cb(null, true);
        cb(new Error("Only JPG, PNG and WEBP image files are allowed."));
    }
});

router.post("/:assignmentId/photos", photoUpload.array("photos", 10), (req, res) => {
    const assignmentId = Number(req.params.assignmentId);
    const stage = req.body.stage === "return" ? "return" : "issue";
    if (!Number.isInteger(assignmentId) || assignmentId <= 0) return res.status(400).json({ success:false, message:"Invalid assignment reference." });
    if (!req.files || !req.files.length) return res.status(400).json({ success:false, message:"Please select at least one photo." });
    db.get("SELECT id FROM asset_assignments WHERE id = ?", [assignmentId], (err, row) => {
        if (err || !row) return res.status(404).json({ success:false, message:"Assignment record not found." });
        const stmt = db.prepare("INSERT INTO assignment_photos (assignment_id, photo_stage, file_name, mime_type, photo_data) VALUES (?, ?, ?, ?, ?)");
        req.files.forEach(file => stmt.run([assignmentId, stage, file.originalname, file.mimetype, file.buffer]));
        stmt.finalize(error => {
            if (error) return res.status(500).json({ success:false, message:"Unable to save asset photos." });
            res.json({ success:true, message:"Photos saved successfully.", count:req.files.length });
        });
    });
});

router.get("/:assignmentId/details", (req, res) => {
    db.get("SELECT details_json FROM assignment_condition_details WHERE assignment_id = ? ORDER BY id DESC LIMIT 1", [Number(req.params.assignmentId)], (err, row) => {
        if (err) return res.status(500).json({ success:false, message:"Unable to load condition details." });
        let details = {};
        try { details = row ? JSON.parse(row.details_json || "{}") : {}; } catch (_) {}
        res.json({ success:true, details });
    });
});

router.get("/:assignmentId/photos", (req, res) => {
    const assignmentId = Number(req.params.assignmentId);
    db.all("SELECT id, photo_stage, file_name, mime_type, uploaded_at FROM assignment_photos WHERE assignment_id = ? ORDER BY id", [assignmentId], (err, rows) => {
        if (err) return res.status(500).json({ success:false, message:"Unable to load photos." });
        res.json({ success:true, photos:rows || [] });
    });
});

router.get("/photo/:photoId", (req, res) => {
    db.get("SELECT file_name, mime_type, photo_data FROM assignment_photos WHERE id = ?", [Number(req.params.photoId)], (err, row) => {
        if (err || !row) return res.status(404).end();
        res.setHeader("Content-Type", row.mime_type);
        res.setHeader("Content-Disposition", `inline; filename=\"${String(row.file_name).replace(/[\"\r\n]/g, "") }\"`);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.end(row.photo_data);
    });
});

// ============================================================
// ASSIGNMENT HISTORY
// ============================================================

router.get(
    "/history/:assetId",
    (req, res) => {

        const assetId =
            req.params.assetId;


        db.all(

            `
            SELECT *

            FROM asset_assignments

            WHERE asset_id = ?

            ORDER BY id DESC

            `,

            [assetId],

            (error, rows) => {

                if (error) {

                    console.error(
                        "Assignment history error:",
                        error.message
                    );

                    return res.status(500).json({

                        success: false,

                        message:
                            "Unable to fetch assignment history."

                    });

                }


                return res.json({

                    success: true,

                    history:
                        rows || []

                });

            }

        );

    }

);


// ============================================================
// GET CURRENT ASSIGNMENT
// ============================================================

router.get(
    "/current/:assetId",
    (req, res) => {

        const assetId = req.params.assetId;

        getAssignmentColumns((schemaError, columns) => {

            if (schemaError) {
                return res.status(500).json({
                    success: false,
                    message: "Unable to check assignment database."
                });
            }

            const hasAssignmentStatus = columns.includes("assignment_status");
            const hasStatus = columns.includes("status");
            const hasReturnedDate = columns.includes("returned_date");

            const currentStatusParts = [];

            if (hasAssignmentStatus) {
                currentStatusParts.push("assignment_status IN ('Active','Assigned','Issued')");
            }

            if (hasStatus) {
                currentStatusParts.push("status IN ('Active','Assigned','Issued')");
            }

            const statusCondition = currentStatusParts.length
                ? `${hasReturnedDate ? "returned_date IS NULL AND " : ""}(${currentStatusParts.join(" OR ")})`
                : (hasReturnedDate ? "returned_date IS NULL" : "1=1");

            const departmentExpr = columns.includes("department")
                ? `COALESCE(NULLIF(department,''), employee_department, '')`
                : `employee_department`;
            const designationExpr = columns.includes("designation")
                ? `COALESCE(NULLIF(designation,''), employee_designation, '')`
                : `employee_designation`;
            const locationExpr = columns.includes("location")
                ? `COALESCE(NULLIF(location,''), employee_location, '')`
                : `employee_location`;
            const remarksExpr = columns.includes("assignment_remarks")
                ? `COALESCE(NULLIF(assignment_remarks,''), remarks, '')`
                : `remarks`;
            const issuedByExpr = columns.includes("issued_by")
                ? `COALESCE(issued_by,'')`
                : `''`;

            db.get(
                `
                SELECT
                    *,
                    ${departmentExpr} AS department_normalized,
                    ${designationExpr} AS designation_normalized,
                    ${locationExpr} AS location_normalized,
                    ${remarksExpr} AS remarks_normalized,
                    ${issuedByExpr} AS issued_by_normalized
                FROM asset_assignments
                WHERE asset_id = ?
                  AND ${statusCondition}
                ORDER BY id DESC
                LIMIT 1
                `,
                [assetId],
                (error, assignment) => {

                    if (error) {
                        console.error("Current assignment error:", error.message);
                        return res.status(500).json({
                            success: false,
                            message: "Unable to fetch current assignment."
                        });
                    }

                    if (assignment) {
                        assignment.department = assignment.department_normalized || "";
                        assignment.designation = assignment.designation_normalized || "";
                        assignment.location = assignment.location_normalized || "";
                        assignment.assignment_remarks = assignment.remarks_normalized || "";
                        assignment.issued_by = assignment.issued_by_normalized || "";

                        return res.json({ success: true, assignment });
                    }

                    // Read-only fallback for legacy/imported assets whose current
                    // assignee was stored on the asset row but no assignment row exists.
                    db.get(
                        `SELECT * FROM assets WHERE asset_id = ? LIMIT 1`,
                        [assetId],
                        (assetError, asset) => {
                            if (assetError) {
                                console.error("Assignment asset fallback error:", assetError.message);
                                return res.status(500).json({
                                    success: false,
                                    message: "Unable to fetch current assignment."
                                });
                            }

                            if (!asset) return res.json({ success: true, assignment: null });

                            const status = String(asset.status || "").trim().toLowerCase();
                            const isAssigned = ["assigned", "active", "issued"].includes(status);
                            const employeeName = asset.assigned_to || asset.assigned_employee_name || asset.employee_name || "";
                            const employeeId = asset.assigned_employee_id || asset.employee_id || "";

                            if (!isAssigned || (!employeeName && !employeeId)) {
                                return res.json({ success: true, assignment: null });
                            }

                            return res.json({
                                success: true,
                                assignment: {
                                    id: 0,
                                    asset_id: asset.asset_id,
                                    employee_id: employeeId,
                                    employee_name: employeeName,
                                    employee_email: asset.assigned_employee_email || asset.employee_email || "",
                                    employee_mobile: asset.assigned_employee_mobile || asset.employee_mobile || "",
                                    department: asset.assigned_department || asset.department || "",
                                    designation: asset.assigned_designation || "",
                                    location: asset.assigned_location || asset.location || "",
                                    assignment_date: asset.assigned_date || "",
                                    expected_return_date: asset.assigned_expected_return_date || "",
                                    handover_condition: asset.condition || "",
                                    assignment_remarks: asset.assigned_remarks || asset.remarks || "",
                                    issued_by: asset.assigned_issued_by || ""
                                }
                            });
                        }
                    );
                }
            );
        });
    }
);


// ============================================================
// EXPORT ROUTER
// ============================================================

module.exports = router;
