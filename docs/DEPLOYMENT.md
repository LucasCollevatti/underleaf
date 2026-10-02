# Underleaf deployment

## Local installation

Requirements:

- Docker Engine with Docker Compose v2;
- at least the resources required by the imported Overleaf Community Edition
  image build;
- `openssl` for generating persistent secrets.

Prepare the configuration:

```bash
cp .env.example .env
sed -i "s/^UNDERLEAF_INVITE_TOKEN_SECRET=.*/UNDERLEAF_INVITE_TOKEN_SECRET=$(openssl rand -base64 32)/" .env
sed -i "s/^UNDERLEAF_SESSION_SECRET=.*/UNDERLEAF_SESSION_SECRET=$(openssl rand -base64 32)/" .env
```

The two secrets must remain stable across restarts. Do not commit `.env`.

Build and start the stack:

```bash
make config
make build
make up
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

- `app`: imported Overleaf Community Edition application and its current
  internal services, including LaTeX compilation;
- `mongo`: MongoDB 7 with the replica set required by the application;
- `redis`: Redis for queues, sessions and real-time collaboration.

The imported revision normally requires MongoDB 8. The Compose profile uses
MongoDB 7 with an explicit Underleaf compatibility flag because MongoDB 8
currently refuses to start on Linux kernel 6.19 (SERVER-121912). Deployments
on a compatible kernel can switch the image to MongoDB 8 and remove that flag.

MongoDB, Redis and the application data are stored in named volumes:

```text
underleaf_app_data
underleaf_app_compiles
underleaf_app_output
underleaf_app_history
underleaf_app_cache
underleaf_app_templates
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

The app, MongoDB and Redis services have healthchecks. The supported compiler
profile runs as a dedicated, internal-only service with no Docker socket, no
application secrets and explicit resource limits. The application image still
contains the imported runtime services required by the current migration stage.

## Local base image

The default build creates `underleaf/base:local` from
`server-ce/Dockerfile-base`. This keeps the Node.js and TeX dependencies used
by the imported revision reproducible and avoids relying on an external
ShareLaTeX-era base image.

`make build` runs both the base-image and application-image builds. To run the
Compose command directly, build the base image first and set
`UNDERLEAF_BASE_IMAGE=underleaf/base:local` in `.env`.

## Compiler image

The application image and the LaTeX compiler image are built separately. The
compiler image contains a curated, explicitly declared TeX Live package set
and the supported tools without publishing a compiler port:

```bash
./scripts/build-compiler.sh
```

The image validates pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX, Biber,
makeindex, TikZ, PGFPlots, Circuitikz, Minted, Fontspec, BibLaTeX and Chemfig
during its build. Add packages to the compiler Dockerfile when the supported
document set grows; update the TeX Live mirror separately from application
releases with `UNDERLEAF_TEXLIVE_MIRROR` when required.

## Compiler safeguards

The `compiler` profile runs as `www-data` with a read-only root filesystem,
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

The first account must be created explicitly from the application container.
The command refuses to create another administrator after one exists:

```bash
./scripts/create-admin.sh
```

Enter the username, password and password confirmation when prompted. Password
input is hidden in an interactive terminal and is never stored in plaintext.
After the account is created, sign in at `/login` and use `/admin/users` to
manage the remaining accounts.

## Security

Read [`SECURITY.md`](SECURITY.md) before publishing the service. It records the
authentication, session, network, container, backup and dependency-audit
baseline.
