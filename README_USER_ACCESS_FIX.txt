ROF Asset Management - User Access / Session Fix

Fixes included:
1. User creation and permission saving now run in a transaction. If permission saving fails, the user creation is rolled back.
2. user_permissions schema is safely rebuilt/migrated to the canonical permission_key/enabled structure while preserving existing permission records.
3. Viewer/IT Support/Asset Manager permissions are enforced by backend and reflected in the frontend UI.
4. Navigation and action buttons are hidden when the logged-in user does not have the required permission.
5. Protected HTML pages are actually guarded before express.static serves them.
6. /api/auth/me returns current database permissions.
7. Login session cookie is session-only (no 8-hour maxAge).
8. A per-browser-tab session marker is used so closing a tab clears the login marker; reopening a protected page redirects to login.

Important:
- Do NOT delete or replace database/asset.db on an existing installation.
- Keep a backup of asset.db before replacing project files.
- Run: npm.cmd install
- Start: npm.cmd start
