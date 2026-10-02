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
```

Recreating containers does not remove these volumes. Removing persistent data
is an explicit operational action and is not part of `make down`.

## Operations

```bash
make logs
make down
docker compose ps
docker compose logs app
```

The app, MongoDB and Redis services have healthchecks. The current baseline
keeps compilation inside the imported app container; compiler isolation and a
dedicated compiler service are planned for M11 and M13.

## Local base image

The default build creates `underleaf/base:local` from
`server-ce/Dockerfile-base`. This keeps the Node.js and TeX dependencies used
by the imported revision reproducible and avoids relying on an external
ShareLaTeX-era base image.

`make build` runs both the base-image and application-image builds. To run the
Compose command directly, build the base image first and set
`UNDERLEAF_BASE_IMAGE=underleaf/base:local` in `.env`.
