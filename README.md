# Underleaf

**Underleaf** is a collaborative, self-hosted LaTeX editor derived from [Overleaf Community Edition](https://github.com/overleaf/overleaf). It is designed for operator-managed installations with local user accounts and an isolated LaTeX compilation service.

**Status:** active beta development. The source is licensed under **AGPL-3.0** and preserves Overleaf provenance and attribution.

## Features

- Browser-based LaTeX editor, multiple files, PDF preview, and **full TeX Live** compilation.
- pdfLaTeX, XeLaTeX, and LuaLaTeX engines; BibTeX/Biber bibliographies.
- Projects, history, real-time collaboration, sharing, and per-user permissions.
- **Username-based** account administration, without public registration, and System/Light/Dark themes.
- Backup and persistent storage through named Docker volumes.

Underleaf removes the original product's commercial/SaaS workflows. See the [architecture](docs/ARCHITECTURE.md) and [project origin](docs/ORIGIN.md).

## Requirements

| Item | Requirement |
| --- | --- |
| Platform | Linux `x86_64/amd64` or Windows with Docker Desktop in Linux containers mode (preferably WSL2) |
| Docker | Docker Engine/Desktop with Compose v2 |
| Memory | At least **8 GB available during the initial build** |
| Disk | At least **30 GB free**, plus space for projects and backups |
| Host tools | Git and Docker; TeX Live, Node.js, Yarn, and Make are **not required** on the host |

**ARM64 and macOS are not officially supported in this release.** Memory and disk figures are starting requirements, not guarantees for heavy projects or concurrent compilation. Full TeX Live significantly increases initial image downloads and disk use.

## Quick start with Docker

**Linux:**

```bash
git clone https://github.com/LucasCollevatti/underleaf.git
cd underleaf
bash ./scripts/underleaf.sh up
```

**Windows (PowerShell):**

Install Docker Desktop with Linux containers enabled and, preferably, WSL2 integration.

```powershell
git clone https://github.com/LucasCollevatti/underleaf.git
Set-Location underleaf
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\underleaf.ps1 up
```

The helpers create `.env` with a persistent session secret, build the required images, and start the stack. The initial build may download large images.

Open **http://localhost:8080** and create the first administrator through `/welcome`. There are no default credentials. Administrators provision additional accounts at `/admin/users`.

> **Why full TeX Live?** The compiler runs in a separate container and imports `/usr/local/texlive` from `texlive/texlive:latest` (or the configured source image). This avoids many missing LaTeX package errors, at the cost of a larger image. Read [Full TeX Live](docs/TEXLIVE.md).

## Daily operations

| Action | Linux | Windows (PowerShell, from repository root) |
| --- | --- | --- |
| Start or refresh containers | `bash ./scripts/underleaf.sh up` | `.\scripts\underleaf.ps1 up` |
| Check health | `bash ./scripts/underleaf.sh health` | `.\scripts\underleaf.ps1 health` |
| Follow logs | `bash ./scripts/underleaf.sh logs` | `.\scripts\underleaf.ps1 logs` |
| Stop without deleting volumes | `bash ./scripts/underleaf.sh down` | `.\scripts\underleaf.ps1 down` |
| Create a backup | `bash ./scripts/underleaf.sh backup` | `.\scripts\underleaf.ps1 backup` |
| Rebuild the TeX compiler image | `bash ./scripts/underleaf.sh build-compiler` | `.\scripts\underleaf.ps1 build-compiler` |

The local setup exposes **HTTP on port 8080** for a trusted LAN or VPN. Do not forward that port directly to the Internet. An optional Caddy/HTTPS overlay exists, but **the project does not claim production hardening for direct public-Internet exposure**.

## Docker services

| Service | Responsibility |
| --- | --- |
| `app` | Web UI, authentication, and internal application services |
| `compiler` | CLSI and full TeX Live in an isolated container |
| `mongo` | Users, projects, and metadata |
| `redis` | Sessions, queues, and real-time collaboration |

The compiler does not publish host ports, receive the app's secrets, or join the MongoDB/Redis backend network. Projects, history, and other data live in named volumes; `down` preserves them.

## Documentation

- [Installation guide](docs/INSTALLATION.md) — Linux, Windows, first administrator, LAN, and HTTPS.
- [Full TeX Live](docs/TEXLIVE.md) — distribution choice, engines, images, resources, and diagnostics.
- [Docker deployment](docs/DEPLOYMENT.md) — Compose, networks, rebuilds, and advanced configuration.
- [Troubleshooting](docs/TROUBLESHOOTING.md) — build, port, container, and compilation failures.
- [Upgrading](docs/UPGRADING.md) — backups, controlled updates, and rollback.
- [Backup](docs/BACKUP.md), [persistence](docs/PERSISTENCE.md), and [observability](docs/OBSERVABILITY.md).
- [Security](docs/SECURITY.md), [development](docs/DEVELOPMENT.md), and [contributing](CONTRIBUTING.md).

## License and credits

Underleaf is distributed under [AGPL-3.0](LICENSE). The imported snapshot and subsequent modifications are documented in [ORIGIN.md](docs/ORIGIN.md), with dependency notices in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). Report defects in issues using sanitized logs; report vulnerabilities through the [private disclosure policy](.github/SECURITY.md). Never publish `.env` files, credentials, backups, or document contents.
