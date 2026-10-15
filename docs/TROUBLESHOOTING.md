# Underleaf troubleshooting

This guide covers the supported Docker deployment: Linux amd64 or Windows with Docker Desktop running Linux containers. Run commands from the repository root.

## Initial diagnosis

```bash
docker info
docker compose version
docker compose --env-file .env ps --all
docker compose --env-file .env logs --tail=200 app compiler mongo redis
```

The platform helpers offer equivalent operations:

| Operation | Linux | Windows PowerShell |
| --- | --- | --- |
| Health | `bash ./scripts/underleaf.sh health` | `.\scripts\underleaf.ps1 health` |
| Validate Compose | `bash ./scripts/underleaf.sh config` | `.\scripts\underleaf.ps1 config` |
| Application logs | `bash ./scripts/underleaf.sh logs` | `.\scripts\underleaf.ps1 logs` |

Identify the failing service and build/startup stage before rebuilding images or changing volumes.

## Slow initial build, failed downloads, or insufficient disk space

Full TeX Live increases the compiler image size and can consume additional space for layers and build caches. Inspect Docker disk consumption:

```bash
docker system df
```

On Windows, check resources available to Docker Desktop and WSL2. **Do not run `docker compose down --volumes` or `docker volume prune` as cleanup shortcuts:** volumes contain permanent user data, projects, and history.

## Access through port 8080

Local mode serves HTTP on `UNDERLEAF_HTTP_PORT` (default `8080`). If the port is already occupied, update `.env`:

```dotenv
UNDERLEAF_HTTP_PORT=8081
UNDERLEAF_SITE_URL=http://localhost:8081
```

Restart with `up`. For access from another LAN device, use the server's reachable IP/hostname in `UNDERLEAF_SITE_URL`; `localhost` on a client refers to that client. Restrict access by firewall and never forward local HTTP directly to the Internet.

## Unhealthy containers

`app` depends on healthy MongoDB, Redis, and compiler services. Inspect each service separately:

```bash
docker compose --env-file .env logs --tail=200 mongo
docker compose --env-file .env logs --tail=200 redis
docker compose --env-file .env logs --tail=200 compiler
docker compose --env-file .env logs --tail=200 app
```

MongoDB uses a **replica set**, required to create the first administrator transactionally. Do not delete database volumes as a first attempt to fix startup problems.

## LaTeX compilation errors

First read the document's compilation log in the editor. To inspect the compiler:

```bash
docker compose --env-file .env ps compiler
docker compose --env-file .env logs --tail=200 compiler
docker compose --env-file .env exec compiler pdflatex --version
docker compose --env-file .env exec compiler kpsewhich tcolorbox.sty
```

Full TeX Live reduces missing-package errors but does not necessarily include external programs or additional system fonts. See [Full TeX Live](TEXLIVE.md) to distinguish document errors from image and resource problems.

## First administrator and login

On a new installation, complete `/welcome` before sharing the address: the first person completing setup becomes an administrator. There are no default credentials. Initialized installations do not reopen `/welcome` after accounts are deleted.

For bootstrap failures, inspect `app`/`mongo` logs and replica-set health. `create-admin` is a specific automation/recovery fallback, **not** a general-purpose password reset for existing accounts.

## HTTPS and Caddy

HTTPS uses `infra/compose/compose.production.yaml` and requires correctly configured DNS/domain settings. On Windows PowerShell, select the overlay before running helpers:

```powershell
$env:UNDERLEAF_COMPOSE_FILES = '-f compose.yaml -f infra/compose/compose.production.yaml'
.\scripts\underleaf.ps1 config
```

See [HTTPS installation](INSTALLATION.md#optional-https-deployment-with-caddy). HTTPS does not replace firewalls, updates, or access control.

## Volumes, backups, and logs

`down` does not delete volumes. Create a backup before destructive maintenance. Restore replaces MongoDB and persistent application data; use only verified, compatible backups.

See [Backup](BACKUP.md), [Persistence](PERSISTENCE.md), and [Upgrading](UPGRADING.md). For issues, provide the Git revision, OS, Docker version, commands used, and a minimal reproduction. Remove passwords, cookies, sensitive IPs, and document contents. Report vulnerabilities [privately](../.github/SECURITY.md).
