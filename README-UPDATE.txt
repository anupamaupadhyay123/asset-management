ROF ASSET MANAGEMENT - UPDATED CODE

Implemented:
1. Asset ID format for new/manual assets: AST-0001, AST-0002, ...
2. Imported Asset ID is preserved exactly as supplied in the Excel/CSV file.
3. Duplicate imported Asset IDs are skipped instead of being silently replaced.
4. Asset list/report are ordered by numeric Asset ID sequence.
5. Imported assignment fields create an assignment record and set asset status to Assigned.
6. Assignment records use status Assigned/Returned consistently.
7. Complete Excel report contains All Assets, Assignment History, User Activity, User Sessions, Import History and Report Info.
8. Audit middleware records authenticated API activity with user, action, asset ID, IP and timestamp.
9. Login/logout session records are stored.
10. Import history records are stored.
11. Existing asset/assignment data is not intentionally deleted by these code changes.

Important:
- database/asset.db is intentionally excluded from this source package and from GitHub via .gitignore.
- Run npm install before starting on a new system.
- Start with: node server.js
- Default login remains username admin / password admin123 unless it has been changed.


LATEST FIXES - 2026-09-04
- Persistent Print opens the issuance form reliably without popup blocking.
- Issuance form now loads localStorage when opened with source=assignment.
- Issuance form includes Asset ID, Designation and Location.
- Assignment lookup is compatible with both status and assignment_status legacy/current fields.
- Return synchronizes both assignment status fields.
- Imported assignment history can establish the current assignee and asset status.
- Asset list shows normalized lifecycle actions and uses a short "Received" repair action.
- Assets marked Available show Assign, Repair and Retire actions.
