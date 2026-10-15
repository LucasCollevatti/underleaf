# Underleaf backup and restore

An Underleaf backup is a **manifest-versioned directory**, not a single archive. It contains:

- `manifest.json`: format, UTC timestamp, Git revision, and file inventory;
- `mongo.archive.gz`: compressed BSON dump of the `sharelatex` database;
- `app-data.tar.gz`: persistent `/var/lib/overleaf/data` content, including history and templates, excluding derived `cache`, `compiles`, and `output`;
- `checksums.sha256`: SHA-256 checksums for the two data archives.

Redis is not restored: sessions, presence, and queues are temporary operational state. App cache and `underleaf_compiler_work` are also derived and excluded. MongoDB and persistent application data are sufficient to recover users, projects, metadata, and history.

## Create a backup

With the stack running and `.env` configured:

```bash
make backup
```

Unless `BACKUP_DIR` is set, output goes to `$HOME/underleaf-backups/underleaf-<UTC_TIMESTAMP>`, outside the checkout. The backup is staged in a protected temporary directory and given its final name only after archives, checksums, and manifest are complete.

To select a destination:

```bash
BACKUP_DIR=/srv/backups/underleaf-2026-10-02 make backup
```

The command fails if the destination already contains files. Store backups outside live volumes, with restricted access: dumps can contain project and user data. Hashes detect accidental corruption but **do not authenticate backup origin**; use trusted backup files and directories only.

## Restore a backup

Restore is intentionally explicit because it replaces the `sharelatex` database and persistent application data:

```bash
make restore BACKUP=/srv/backups/underleaf-2026-10-02
```

The Make target passes `--yes` after receiving the operator-supplied path. The script stops the app, validates the manifest and hashes, restores MongoDB and named-volume data, and starts the app again. Project history is restored alongside application data; derived caches, compilations, and outputs are discarded and recreated as needed. Redis starts with empty ephemeral state.

The current format version is `1`. Restore continues to accept older backups in this format. If they contain `data/compiles`, `data/output`, or `data/cache`, those derived artifacts are dropped after extraction. Backups are compatible with installations using the same MongoDB schema and persistent paths. Before a structural upgrade, take a backup and rehearse restoration in an isolated copy.

On Windows, use native PowerShell commands:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 backup
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 restore -Backup C:\backups\underleaf-2026-10-02 -Yes
```

## Round-trip test

The verification procedure combines existing smoke tests:

1. Create a user and project, edit, and compile using dashboard/editor tests.
2. Run `make backup BACKUP_DIR=...`.
3. Confirm `manifest.json`, checksums, and both data archives.
4. Restore with `make restore BACKUP=...` in a disposable installation.
5. Repeat login, history access, and compilation.

Never perform step 4 on an installation with important data without preserving the original backup and confirming the restore destination.
