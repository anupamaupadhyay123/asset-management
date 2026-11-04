# ROF Asset Management – Import & Backup Format

## Assets sheet
Asset ID is the system reference. If Asset ID is supplied it must already exist in the system; an unknown Asset ID is rejected. If Asset ID is blank, the system generates the next AST-0000 style ID.

Status values: Available, Assigned, Under Repair, Retired. If current assignment columns are populated and Status is Assigned, the current assignment is created/updated.

## Assignment History sheet
Optional. Each row is a historical assignment. Asset ID must exist. Duplicate assignment records are skipped. Returned rows remain history with Returned status.

## Repair History sheet
Optional. Asset ID must exist. Repair records are retained separately.

## Full Backup
Reports > Full System Backup downloads all application tables as `ROF_Full_Backup.json`. Reports > Restore Backup restores that complete backup. Keep multiple dated copies offline.
