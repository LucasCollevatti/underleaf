# Upgrading Underleaf

Underleaf is in **beta**. Automated migration across multiple versions and database rollback across incompatible schemas are not guaranteed. Upgrade in a controlled manner and preserve backups before changing images or code.

## Before upgrading

1. Identify the running version/Git revision and review the intended target revision.
2. Check `app`, `compiler`, `mongo`, and `redis` health.
3. Create a complete backup and verify its manifest and checksums.
4. Preserve `.env` separately in secure storage: **the data backup does not include the session secret**.
5. For schema changes, test upgrade and restore using a genuinely isolated Docker installation.

Volumes use fixed names. Changing only the Compose project name **does not isolate data**.

## Backup and upgrade

On Linux:

```bash
bash ./scripts/underleaf.sh health
bash ./scripts/underleaf.sh backup
```

On Windows PowerShell:

```powershell
.\scripts\underleaf.ps1 health
.\scripts\underleaf.ps1 backup
```

Choose the revision you intend to deploy. `main` is a development branch; `git pull` is not equivalent to installing a stable release. To advance the current branch after saving local work:

```bash
git status --short
git pull --ff-only
```

Review changes in `.env.example`, Compose, and migrations. **Do not overwrite your existing `.env` with `.env.example`.** Bring up the selected revision:

Linux:

```bash
bash ./scripts/underleaf.sh up
bash ./scripts/underleaf.sh health
```

Windows:

```powershell
.\scripts\underleaf.ps1 up
.\scripts\underleaf.ps1 health
```

`up` may rebuild images. For reproducible LaTeX packages, pin `UNDERLEAF_TEXLIVE_IMAGE` to a verified immutable image reference; see [TEXLIVE.md](TEXLIVE.md).

## After upgrading

Verify login, projects, PDF compilation, collaboration, sharing, and history. Preserve relevant failure logs and consult [Troubleshooting](TROUBLESHOOTING.md) before changing the installation.

## Restore and rollback

`down` preserves volumes; **do not use `docker compose down --volumes`** during upgrades. Restore requires confirmation and replaces the database and persistent data. Reverting Git code or container images does not automatically reverse MongoDB migrations. Restore only backups compatible with the target revision's schema.

See [BACKUP.md](BACKUP.md) and [PERSISTENCE.md](PERSISTENCE.md). When compatibility is uncertain, rehearse recovery on an isolated copy before touching production data.
