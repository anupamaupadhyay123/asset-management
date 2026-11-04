ROF ASSET MANAGEMENT - USER PERMISSION SCHEMA FIX

Issue fixed:
SQLite error: no such column: permission_key

Cause:
An existing user_permissions table can come from an older version with a different permission column name. CREATE TABLE IF NOT EXISTS does not change an existing table schema.

Fix:
- database.js now checks the existing user_permissions schema.
- Adds permission_key if it is missing.
- Adds enabled if it is missing.
- Migrates values from common legacy columns (permission, permission_name, permission_code, key) when present.
- Creates permission indexes only after the migration.
- Existing data is preserved; asset.db is not deleted or replaced.

After replacing database/database.js:
1. Stop the running Node server (Ctrl+C).
2. Start again with: npm.cmd start
3. The console should no longer show the permission_key SQLite error.
4. Open Settings > User Management and test Add User.

IMPORTANT:
Do not delete database/asset.db. Back it up before any database work.
