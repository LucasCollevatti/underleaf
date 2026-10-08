# Underleaf deployment

## Local installation

Requirements:

- Docker Engine with Docker Compose v2;
- at least the resources required by the imported Overleaf Community Edition
  image build;
- one of the included platform helpers to generate the persistent session secret.

Prepare the configuration:

```bash
bash ./scripts/underleaf.sh init
```

The session secret must remain stable across restarts. Do not commit `.env`.

Build and start the stack:

```bash
bash ./scripts/underleaf.sh up
docker compose ps
```

By default, the application is available at
`http://localhost:8080`. The port and public URL can be changed in `.env`.

For production, validate and apply the production overlay:

```bash
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" make config
docker compose -f compose.yaml -f infra/compose/compose.production.yaml \
  --env-file .env up -d
```

The production overlay removes the app host port and publishes only the Caddy
ports configured by `UNDERLEAF_PROXY_HTTP_PORT` and
`UNDERLEAF_PROXY_HTTPS_PORT`. Set `UNDERLEAF_SITE_DOMAIN` and
`UNDERLEAF_SITE_URL=https://...` before starting it. Caddy obtains and renews
public certificates automatically and forwards HTTP, HTTPS and WebSocket
traffic to the app. See [`INSTALLATION.md`](INSTALLATION.md) for the complete
DNS and first-admin procedure.

## Services and persistence

The initial baseline contains:

- `app`: imported Overleaf Community Edition application and its non-compiler
  internal services;
- `compiler`: dedicated internal CLSI service for LaTeX compilation;
- `mongo`: MongoDB 7 with the replica set required by the application;
- `redis`: Redis for queues, sessions and real-time collaboration.

The imported revision normally requires MongoDB 8. The Compose profile uses
MongoDB 7 with an explicit Underleaf compatibility flag because MongoDB 8
currently refuses to start on Linux kernel 6.19 (SERVER-121912). Deployments
on a compatible kernel can switch the image to MongoDB 8 and remove that flag.

MongoDB, Redis and the application data are stored in named volumes:

```text
underleaf_app_data
underleaf_app_history
underleaf_app_cache
underleaf_app_templates
underleaf_compiler_work
underleaf_mongo_data
underleaf_redis_data
underleaf_proxy_data
underleaf_proxy_config
```

Recreating containers does not remove these volumes. Removing persistent data
is an explicit operational action and is not part of `make down`.

See [`PERSISTENCE.md`](PERSISTENCE.md) for the complete volume map, ownership,
retention guidance and the recreation smoke test.

Use `make health` for a JSON health report and `make backup`/`make restore
BACKUP=/path/to/backup` for the documented recovery flow. The complete backup
format is in [`BACKUP.md`](BACKUP.md); observability details are in
[`OBSERVABILITY.md`](OBSERVABILITY.md).

## Operations

```bash
make dev
make build
make test
make logs
make down
docker compose ps
docker compose logs app
```

The app, compiler, MongoDB and Redis services have healthchecks. The dedicated
compiler service runs internally with no Docker
socket, no application secrets and explicit resource limits. The application
image still contains the imported non-compiler runtime services required by the
current migration stage.

## Local base image

The default build creates `underleaf/base:local` from
`server-ce/Dockerfile-base`. This keeps the Node.js and TeX dependencies used
by the imported revision reproducible and avoids relying on an external
ShareLaTeX-era base image.

`make build` runs the base, application and compiler image builds. The Compose
`base` service owns the base-image build so a fresh checkout does not depend on
an image created by a separate command.

## Web-only rebuild

The application build must use the same local base image as the full Underleaf
build. Do not mix the current source tree with an external ShareLaTeX base:
native Node.js modules are compiled against the system runtime provided by
`underleaf/base:local`.

Build the base image once on a new host:

```bash
make build-base
```

That one-time base build includes TeX Live and the native system dependencies
required by the application. After the base exists locally, UI and web-service
changes do not rebuild it:

```bash
make web
```

`make web` first verifies that `underleaf/base:local` exists, rebuilds only
`underleaf/app:local` from that base, and recreates only the `app` service
with `--no-deps`. It does not run `server-ce/Dockerfile-base`, does not
reinstall TeX Live, and does not recreate MongoDB, Redis, or named volumes.

## Compiler image

The application image and the LaTeX compiler image are built separately. The
base image installs one TeX Live release with the basic scheme and the
explicitly supported compiler packages. The compiler image inherits that
installation and verifies the supported tools and packages without publishing
a compiler port:

```bash
./scripts/build-compiler.sh
```

The image validates pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX, Biber,
makeindex, TikZ, PGFPlots, Circuitikz, Minted, Fontspec, BibLaTeX and Chemfig
during its build. The base and compiler use one TeX Live release and mirror;
the compiler must not install packages after the base is built.

## Compiler safeguards

The `compiler` service runs as `www-data` with a read-only root filesystem,
all Linux capabilities dropped, `no-new-privileges`, controlled temporary
filesystems, configurable CPU/memory limits and an internal-only network. It
does not mount the Docker socket and receives no application secrets.

`UNDERLEAF_COMPILE_TIMEOUT` controls the maximum compile timeout, while
`UNDERLEAF_COMPILE_CPUS` and `UNDERLEAF_COMPILE_MEMORY` configure infrastructure
resources. `UNDERLEAF_MAX_PROJECT_SIZE=0` keeps the product-level project-size
cap disabled; container, request-body and filesystem limits remain independent
infrastructure safeguards. These values protect the installation and are not
commercial plans or feature tiers.

## First administrator

Open the installation URL after `docker compose up`. An empty installation
redirects to `/welcome`, where you create the first administrator. Creation
and initialization commit together in MongoDB; the existing session login
flow then signs you in and redirects to `/project`.

The persistent singleton `underleafInstallations/installation` is stored in
the MongoDB volume and must be included in backups. Once initialized, Welcome
redirects to `/login` or `/project` and rejects further bootstrap writes.
Existing installations with any user are adopted as initialized automatically;
no users or projects are rewritten. Deleting users does not reopen setup.
The supported Compose replica set is required for bootstrap transactions.

For operator recovery or automation only:

```bash
./scripts/create-admin.sh
```

The CLI uses the same transactional bootstrap lock and refuses to create an
administrator if any already exists, including disabled administrators. It can
restore an administrator to an initialized installation without reopening web
setup. Password input is hidden in an interactive terminal; automation uses
stdin rather than process arguments. Use `/admin/users` for ordinary account
management.

Complete Welcome before making a fresh installation publicly reachable: the
first person who completes it becomes the administrator.

## Identity and appearance

Authentication, administration and project sharing use username exclusively.
Do not provision technical email addresses. Administrators create accounts and
reset forgotten passwords through `/admin/users`; email confirmation, secondary
emails and email recovery are not product flows.

Existing accounts are adapted by the versioned username identity migration,
`tools/migrations/20261005100000_underleaf_username_identity.mjs`, using the
existing migration mechanism. It removes email identity fields/indexes and
establishes the canonical username index. Preserve a full backup before an
upgrade and validate the migration against a restored copy first. The first-run
E2E suite does not validate an upgrade of existing data.

The installation state, user identities and authenticated theme preferences
are persisted in MongoDB. Include them in backup/restore and container
recreation verification. System follows the operating-system theme; Light and
Dark remain account preferences across login and navigation. Visitor theme
selection is stored locally in the browser.

## Status and product validation

HTML `/status` is administrator-only and shows web-process uptime and configured
access flags. Public plaintext/JSON/wildcard monitoring requests retain their
existing response. Use `make health` and the probes documented in
[`OBSERVABILITY.md`](OBSERVABILITY.md) to assess actual service dependencies.

[`DEVELOPMENT.md`](DEVELOPMENT.md) documents the product suites, current
validation status and the disposable-installation requirement for the E2E
journey. The supplied Compose fixes container, volume and network names; a
different Compose project name alone does not isolate test data. Use a separate
Docker environment or override all shared names and ports before running the
bootstrap suite.

## Security

Read [`SECURITY.md`](SECURITY.md) before publishing the service. It records the
authentication, session, network, container, backup and dependency-audit
baseline.
