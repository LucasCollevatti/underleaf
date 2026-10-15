# Underleaf 1.0 release matrix

This matrix summarizes functionality validated across milestones M0–M22 and identifies evidence to repeat before publishing a deployment.

**This is a release checklist, not proof that every test has passed.** Execute each check against a disposable installation or controlled environment and record its commit, container image, and outcome.

| Capability | Primary evidence |
| --- | --- |
| Username/password accounts without public registration | `scripts/create-admin.sh`; registration and reset routes are disabled when `settings.underleaf` is active |
| Roles, disabled accounts, and administration | `/admin/users` and `services/web/app/views/underleaf/admin-users.pug` |
| Projects and file operations | `tests/underleaf-project-dashboard-smoke.mjs` and `tests/underleaf-editor-smoke.mjs` |
| Multi-file editing, upload, images, and BibTeX | `tests/underleaf-editor-smoke.mjs` |
| Preview, logs, errors, and SyncTeX | `tests/underleaf-editor-smoke.mjs` and `tests/underleaf-compiler-smoke.sh` |
| Real-time collaboration | `services/real-time/test/acceptance/underleaf-collaboration-smoke.mjs` |
| Supported TeX engines and packages | `tests/underleaf-compiler-smoke.sh` |
| Owner/editor/viewer sharing | `tests/underleaf-sharing-smoke.mjs` |
| History, attribution, and restoration | `services/real-time/test/acceptance/underleaf-history-smoke.mjs` |
| Persistence, health, backup, and restore | `tests/underleaf-persistence-smoke.sh`, `make health`, `make backup`, and `make restore` |
| HTTPS and WebSockets | `infra/proxy/Caddyfile`, production overlay, and `docs/INSTALLATION.md` |
| Network and compiler isolation | `tests/underleaf-security-smoke.sh` and `docs/SECURITY.md` |

## Publication gate

In a disposable installation:

```bash
make config
make build
make up
./scripts/create-admin.sh
make health
tests/underleaf-security-smoke.sh
corepack yarn npm audit --all --recursive --severity moderate --json
```

Repeat the dashboard, editor, sharing, collaboration, compiler, history, backup, and restore smoke tests documented above. **Never commit or publish `.env`, backups, or logs containing sensitive information.**
