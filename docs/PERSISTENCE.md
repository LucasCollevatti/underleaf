# Underleaf persistence

The canonical Compose stack uses stable, explicitly named Docker volumes. `make down` removes containers and networks **without deleting volumes**. Data deletion must be deliberate and preceded by a backup.

## Data map

| Data | Service | Volume | Container path | Purpose |
| --- | --- | --- | --- | --- |
| Users, projects, and metadata | `mongo` | `underleaf_mongo_data` | `/data/db` | Source of truth for MongoDB data |
| Temporary sessions, queues, and presence | `redis` | `underleaf_redis_data` | `/data` | Operational state; not a substitute for MongoDB or history |
| General application data | `app` | `underleaf_app_data` | `/var/lib/overleaf` | Persistent files without a dedicated child volume |
| Revision history | `app` | `underleaf_app_history` | `/var/lib/overleaf/data/history` | Queues, snapshots, and local project-history data |
| Application cache | `app` | `underleaf_app_cache` | `/var/lib/overleaf/data/cache` | Derived cache, not the source of truth |
| Templates | `app` | `underleaf_app_templates` | `/var/lib/overleaf/data/template_files` | Application template files |
| Compiler working data | `compiler` | `underleaf_compiler_work` | `/var/lib/underleaf/compiler` | Derived compilations, cache, and outputs; read-only in the app |
| Proxy state and certificates | `proxy` | `underleaf_proxy_data` | `/data` | ACME certificates, local CA, and Caddy state |
| Proxy configuration state | `proxy` | `underleaf_proxy_config` | `/config` | Persistent Caddy state; not the version-controlled Caddyfile |

The `app_history`, `app_cache`, and `app_templates` volumes mount at child paths of `app_data`. Each child mount takes precedence at its path without hiding unrelated general application data. The compiler never writes to `app_data`; LaTeX work stays in `compiler_work`. Do not switch these to bind mounts without updating backup and restore procedures.

Upgraded installations may retain orphaned `underleaf_app_compiles` and `underleaf_app_output` volumes from an earlier topology. They are no longer mounted or needed by the current runtime. Preserve them through the rollback window and remove them only after validating compilation and restoration.

## Permissions and retention

- The compiler runs as `www-data`; restrict write access to `underleaf_compiler_work` accordingly.
- The app writes to `app_*` volumes. Preserve file ownership and permissions when accessing them from the host.
- Never publish MongoDB or Redis host ports in production.
- Preserve `underleaf_proxy_data` and `underleaf_proxy_config` so certificates and Caddy state survive recreation.
- Back up MongoDB, persistent app data, `app_history`, `app_templates`, and the manifest. `app_cache` and `compiler_work` are derived and recreated; legacy `data/compiles` and `data/output` are excluded too.
- Keep backups separate from active volumes, with at least one copy protected against accidental deletion. Set retention policies operationally and test restoration before shortening retention.

## Container recreation verification

The following smoke test writes a temporary marker to the history volume, recreates the `app` container, and verifies the marker remains:

```bash
./tests/underleaf-persistence-smoke.sh
```

The test removes only its marker and does not run `docker compose down --volumes`.
