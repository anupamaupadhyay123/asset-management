ROF Asset Management - Assignment / Print Fix

Files included:
1. routes/assignmentRoutes.js
2. public/js/assets.js

Changes:
- More robust current-assignment detection for Active/Assigned/Issued records.
- Imported/legacy Assigned assets can be returned even if their assignment row is missing.
- Current assignee details are loaded into the Assets table from the current-assignment endpoint.
- Print uses current assignment details and supports legacy/imported asset-row assignment data.
- Existing Return/Print/action flow is preserved.

Backup your current files before replacing them.

WINDOWS QUICK START
1. Open PowerShell in this folder. Run: npm.cmd install
2. Copy .env.example to .env and enter the actual SMTP values supplied by ROF IT.
3. Run: node server.js
4. Open http://localhost:3000/login.html

IMPORTANT: OTP delivery is not possible until ROF IT provides the real SMTP host and approved authentication password/app password. Do not use the example values. See README_PASSWORD_RECOVERY_SETUP.txt.
