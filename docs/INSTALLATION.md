# Installing Underleaf on your computer

This guide uses Docker Compose and the supplied platform helpers. You do **not** need to install TeX Live, Node.js, Yarn, or Make on the host. For the compiler design and image-size trade-offs, see [Full TeX Live](TEXLIVE.md).

## Requirements

- An `x86_64/amd64` host; ARM64 and macOS are not supported targets in this release.
- Docker Desktop or Docker Engine with Compose v2, and Git.
- At least **8 GB of available RAM during the build**.
- At least **30 GB of free disk space** for images, caches, and volumes, plus storage for projects and backups.
- A trusted local network or VPN between users and the host.

## Basic local installation

```bash
git clone https://github.com/LucasCollevatti/underleaf.git underleaf
cd underleaf
bash ./scripts/underleaf.sh up
```

## Windows

Install Docker Desktop in Linux containers mode, preferably with WSL2 integration. Use the PowerShell helper for all operations; Make is not required.

```powershell
git clone https://github.com/LucasCollevatti/underleaf.git underleaf
Set-Location underleaf
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 up
```

Daily commands use the same script with `health`, `logs`, or `down`. It also supports `create-admin`, `test`, `backup`, and `restore`. Docker Desktop runs the Linux-based Underleaf runtime inside containers.

Open <http://localhost:8080>. A fresh installation starts at `/welcome`: select **Set up Underleaf**, create the administrator, and allow the automatic login to `/project`. Login and Welcome share the same sidebar and theme selector. There are no default credentials and no public registration of additional accounts.

The local stack publishes port 8080 and keeps data in named Docker volumes. Stop without deleting these volumes using `bash ./scripts/underleaf.sh down` on Linux or `.\scripts\underleaf.ps1 down` on Windows. Initial startup also builds the full TeX Live compiler image, so the first download may be large; see [TEXLIVE.md](TEXLIVE.md).

### Access from a local network

The local stack uses unencrypted HTTP on port 8080. For other devices on the trusted LAN, set the host's reachable address in `.env`:

```dotenv
UNDERLEAF_SITE_URL=http://192.168.1.50:8080
UNDERLEAF_HTTP_PORT=8080
```

Replace the sample IP with the actual server address and allow the port only through the trusted network firewall. **Do not forward this HTTP port to the Internet.** Use a VPN or operator-managed HTTPS proxy when access crosses untrusted networks. Direct Internet hardening is not guaranteed.

Installation initialization and first-administrator creation are committed together in MongoDB. The Compose replica set is required for this transaction. If setup fails, retry Welcome; after initialization, additional bootstrap requests are rejected. Existing installations with users are recognized as initialized. Deleting accounts never reopens Welcome.

## Accounts and appearance

Login and sharing use **username**, not email addresses or synthetic email identifiers. At `/admin/users`, administrators provision accounts, change usernames and display names, reset passwords, and manage roles and account status. Forgotten passwords are reset by an administrator; email-based recovery is unavailable.

In Settings, users can change their display name, password, and appearance. System follows the operating-system theme; Light and Dark set fixed appearances. Account preferences persist across navigation, logout/login, and restarts. Guests can select a local browser theme from the Welcome and Login sidebar.

HTML `/status` is an administrative page with web-process state and site/editor access flags. For actual service health, use `make health` or the platform health helper as documented in [Observability](OBSERVABILITY.md).

## Optional HTTPS deployment with Caddy

Before starting the proxy, configure a domain that resolves to the host and set appropriate DNS records. Set values in `.env` such as:

```dotenv
UNDERLEAF_SITE_DOMAIN=underleaf.example.com
UNDERLEAF_SITE_URL=https://underleaf.example.com
UNDERLEAF_PROXY_HTTP_PORT=80
UNDERLEAF_PROXY_HTTPS_PORT=443
```

Validate and start the production Compose overlay on Linux:

```bash
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make config
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make build
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make up
```

On Windows PowerShell, choose the same overlay with `UNDERLEAF_COMPOSE_FILES`, without installing Make:

```powershell
$env:UNDERLEAF_COMPOSE_FILES = '-f compose.yaml -f infra/compose/compose.production.yaml'
.\scripts\underleaf.ps1 config
.\scripts\underleaf.ps1 build
.\scripts\underleaf.ps1 up
```

Set `UNDERLEAF_SITE_DOMAIN` and `UNDERLEAF_SITE_URL` in `.env` before running these commands. Keep `UNDERLEAF_COMPOSE_FILES` set in later sessions when operating this deployment.

Caddy can obtain and renew ACME certificates when DNS and public ports are correctly configured. Certificate state persists in `underleaf_proxy_data` and `underleaf_proxy_config`. Localhost testing uses a local certificate and may trigger browser warnings; it is not a publicly trusted certificate.

**The production overlay does not make a deployment automatically safe for the public Internet.** Firewall, host updates, DNS, VPN/HTTPS, access control, and exposure review remain the operator's responsibility. Prefer a trusted LAN or VPN for home and laboratory installations.

Open the configured domain and complete Welcome. Existing installations continue to use `/login`.

For automation or recovery when no administrator exists, use the CLI with the same Compose files:

```bash
UNDERLEAF_COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  ./scripts/create-admin.sh
```

The CLI refuses to create another administrator if one already exists, including disabled administrators. It does not reopen Welcome. Passwords come from hidden terminal input or stdin, never process arguments.

## Daily operations

```bash
make health
make logs
make backup # default: $HOME/underleaf-backups/underleaf-<UTC>
# alternatively: BACKUP_DIR=/srv/backups/underleaf-$(date +%F) make backup
make down
```

To restore a specific backup:

```bash
make restore BACKUP=/srv/backups/underleaf-2026-10-02
```

In PowerShell:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 backup
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 restore -Backup C:\backups\underleaf-2026-10-02 -Yes
```

Backup never overwrites an existing destination. Restore validates its manifest, hashes, archives, and connectivity before stopping the app; it requires `--yes` or `-Yes` because it replaces MongoDB and persistent data.

Read [Deployment](DEPLOYMENT.md), [Backup](BACKUP.md), [Persistence](PERSISTENCE.md), and [Security](SECURITY.md) before exposing an installation to untrusted networks.

For development and test environments see [DEVELOPMENT.md](DEVELOPMENT.md). Initial installation and upgrading existing data are different procedures: take a complete backup and follow [UPGRADING.md](UPGRADING.md) before updating. For failures, see [TROUBLESHOOTING.md](TROUBLESHOOTING.md).
