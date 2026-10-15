# Scripts

Add Underleaf operational scripts to this directory. Imported helper scripts remain close to their original services until each migration can be validated without changing behavior.

`underleaf-health.sh` prints service health and operational metrics as one JSON line without sensitive data.

`underleaf-backup.sh` and `underleaf-backup.ps1` create a manifest, a MongoDB archive, and an application-data archive, outside the checkout by default.

`underleaf-restore.sh` and `underleaf-restore.ps1` validate the manifest, hashes, archives, and connectivity before replacing MongoDB and application data. Restoration requires explicit `--yes` or `-Yes` confirmation.
