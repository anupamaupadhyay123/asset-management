const express = require("express");

const router = express.Router();

const db = require("../database/database");


// ============================================================
// DASHBOARD SUMMARY
// ============================================================

router.get("/", (req, res) => {

    const query = `

        SELECT

            COUNT(*) AS total,

            SUM(
                CASE
                    WHEN status = 'Available'
                    THEN 1
                    ELSE 0
                END
            ) AS available,

            SUM(
                CASE
                    WHEN status = 'Assigned'
                    THEN 1
                    ELSE 0
                END
            ) AS assigned,

            SUM(
                CASE
                    WHEN status = 'Under Repair'
                    THEN 1
                    ELSE 0
                END
            ) AS under_repair,

            SUM(
                CASE
                    WHEN status = 'Retired'
                    THEN 1
                    ELSE 0
                END
            ) AS retired

        FROM assets

    `;


    db.get(
        query,
        [],
        (error, summary) => {

            if (error) {

                console.error(
                    error.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to load dashboard."

                });

            }


            res.json({

                success: true,

                summary: {

                    total:
                        summary.total || 0,

                    available:
                        summary.available || 0,

                    assigned:
                        summary.assigned || 0,

                    under_repair:
                        summary.under_repair || 0,

                    retired:
                        summary.retired || 0

                }

            });

        }
    );

});


// ============================================================
// RECENT ACTIVITY
// ============================================================

router.get("/activity", (req, res) => {

    const query = `
        SELECT id, asset_id, activity_type, description, created_at, username
        FROM (
            SELECT id, asset_id, activity_type, description, created_at, '' AS username
            FROM activity_history
            UNION ALL
            SELECT id, asset_id, action_type AS activity_type, description, created_at,
                   COALESCE(NULLIF(full_name, ''), username, '') AS username
            FROM user_activity_log
        ) AS combined_activity
        ORDER BY datetime(created_at) DESC, id DESC
        LIMIT 10
    `;


    db.all(
        query,
        [],
        (error, rows) => {

            if (error) {

                console.error(
                    error.message
                );

                return res.status(500).json({

                    success: false,

                    message:
                        "Unable to load activity."

                });

            }


            res.json({

                success: true,

                activities: rows

            });

        }
    );

});


module.exports = router;