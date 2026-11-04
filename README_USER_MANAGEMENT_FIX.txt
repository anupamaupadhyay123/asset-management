ROF Asset Management - User Management Fix
==========================================

This package is based on the uploaded ROF_Asset_Management_Improved_Final project.

Fixed:
- User Management Add User form
- Create User API
- Edit User API
- Enable / Disable user
- Admin password reset for users
- Individual permissions
- Small professional permission checkboxes matching the system UI
- Working X / Cancel / outside-click / Escape modal close
- User permissions database table with safe migration
- User email field with safe migration
- Backend permission enforcement for assets, assignments, reports and dashboard
- User-management audit logging
- Existing asset/assignment/report functionality retained

IMPORTANT:
- database/asset.db is intentionally NOT included in this update ZIP.
- Keep your current database/asset.db so existing asset data is not overwritten.
- The updated database/database.js automatically adds the required email and user_permissions schema.
- node_modules is intentionally not included. Run npm install on the target system.

Installation:
1. Backup your current project folder.
2. Extract this ZIP over the existing project folder.
3. Do NOT delete database/asset.db.
4. Open terminal in the project folder.
5. Run: npm install
6. Start: npm start
7. Open: http://localhost:3000

For Windows PowerShell, if npm.ps1 is blocked:
   npm.cmd install
   npm.cmd start

Admin:
- Existing Admin user remains unchanged.
- Admin role automatically has full permissions.

User Management is available in Settings for Admin users.


NO-EMAIL PASSWORD CHANGE UPDATE
===============================
- In Settings > User Management, click Edit beside the employee.
- Enter a new password in "New Password (optional)" (minimum 8 characters), then click Save Changes.
- Leave the field blank to keep the existing password.
- This admin-only action updates the password securely using the existing password-hash method and records an audit entry. It does not send email and does not require SMTP.
- If the admin is locked out and cannot sign in, stop the application and use the interactive offline recovery script: node reset-admin-password.js. Run it only on the trusted server with authorized access; it prompts for the username and a new password.
