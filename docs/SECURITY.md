# Security baseline

This document records the baseline security design of self-hosted Underleaf. It describes repository safeguards and operator responsibilities; it does **not** replace host updates, firewalls, or review of network exposure.

## Authentication and sessions

- On an empty installation, `/welcome` creates the first administrator without default credentials. Complete setup before granting other users access: the first person to finish Welcome becomes an administrator.
- Bootstrap requires CSRF protection and rate-limits attempts per IP. Administrator creation and persistent initialization use a single majority-confirmed transaction on the MongoDB replica set. Concurrent attempts contend on the same record.
- Existing installations with any user are adopted as initialized. The state does not depend on retaining an active administrator and cannot be reopened by deleting accounts. GET `/welcome` redirects after initialization; POST rejects further creation.
- `scripts/create-admin.sh` is an automation/recovery fallback requiring server access. It uses the same lock and rejects creation when an administrator exists, including a disabled one. There is no web bootstrap-recovery route.
- Automatic login reuses auditing and session/CSRF regeneration. If it fails after the transaction commits, the administrator account remains created and users can log in normally; bootstrap stays closed.
- Underleaf disables public registration, email-based password reset, and email invitations. Administrators provision additional accounts.
- Password hashing uses the inherited bcrypt authentication flow, with 12 rounds by default in production.
- `UNDERLEAF_SESSION_SECRET` is mandatory. Keep it random, stable across restarts, and stored only in `.env` or an operator-managed secrets system.
- CSRF is enforced by application middleware; login has both per-IP and per-account-identifier rate limits.
- The production overlay enables `Secure` cookies, retains `SameSite=Lax`, enables CSP, and keeps subnet rate limiting active.

## Network topology

- In production, only Caddy publishes ports 80 and 443.
- The application does not publish a host port; it is reachable through the proxy on the standard Docker network.
- MongoDB and Redis live only on the internal `underleaf_app_backend` network.
- The compiler lives only on `underleaf_compiler_net`, with no access to MongoDB/Redis networks and no published host port.
- The compiler's only required app access is to the app's filestore. It receives neither application secrets nor the Docker socket.
- Caddy forwards WebSocket traffic automatically via `reverse_proxy`.

## Containers and filesystem

The compiler runs as `www-data:www-data`, with a read-only root filesystem, all capabilities dropped, `no-new-privileges`, controlled tmpfs mounts, explicit CPU/memory/PID limits, and a single writable volume: `/var/lib/underleaf/compiler`. The production overlay also applies `no-new-privileges` and resource limits to the app.

The inherited application still uses a privileged init process to manage internal services. This known limitation is documented for future migration. Do not expose the app directly to the Internet, even when the proxy is disabled.

The local stack is designed for a trusted LAN or VPN. HTTP on port 8080 is unencrypted; the project does not guarantee public-Internet hardening. Operators are responsible for firewalls and, where necessary, Caddy/HTTPS.

## Backups and logs

- Store backups outside active volumes, restrict permissions, and define retention based on operational requirements.
- `make backup` excludes secrets from `.env`.
- Structured logs must not contain passwords, hashes, cookies, tokens, secrets, or document contents. Request IDs are restricted to safe characters and are not credentials.
- Do not publish the output of `make health` on public pages: it reports operational state and disk capacity.

## Reproducible checks

```bash
tests/underleaf-security-smoke.sh
tests/underleaf-compiler-boundary-smoke.sh
tests/underleaf-compiler-sandbox-smoke.sh
corepack yarn npm audit --all
```

The first test checks effective production Compose topology. The boundary test confirms the app uses the dedicated compiler and no longer starts CLSI internally. The sandbox test inspects limits, capabilities, mounts, networking, and secrets, and checks denial of writes to the root filesystem, Docker socket access, and MongoDB/Redis resolution. Repeat the dependency audit whenever the lockfile or base image changes.

## Historical snapshot audit

**Historical record:** the following figures describe the import on October 2, 2026, **not the current `main` security audit**. See [SECURITY-AUDIT.md](SECURITY-AUDIT.md) for more recent results, mitigations, and documented risk exceptions before publishing a deployment.

On 2026-10-02, `corepack yarn npm audit --all` reported 22 high, 29 moderate, and 4 low findings, plus 6 deprecated dependency entries. Most came from the imported snapshot, including older `axios`, `xmldom`, `multer`, `nodemailer`, and `js-yaml` versions.

These findings remain documented for historical context; the M22 baseline does not claim the imported lockfile was vulnerability-free. Before exposing an installation to the public Internet, high-severity findings must be remediated, mitigated, or formally accepted by its operator with updated audit evidence.
