# Compose overlays

The canonical local stack is defined at [`../../compose.yaml`](../../compose.yaml). Files in this directory are explicit overlays:

- `compose.development.yaml`: disables automatic restarts and enables `debug` logging.
- `compose.production.yaml`: configures restart policies, CPU/memory limits, `init`, log rotation, secure cookies, and Caddy as the only public entry point, while retaining the dedicated compiler service.

## Development

```bash
make dev
make health
make logs
make test
make down
```

To apply the development overlay manually:

```bash
docker compose -f compose.yaml \
  -f infra/compose/compose.development.yaml \
  --env-file .env up -d
```

## Production overlay

First validate required variables and the merged configuration:

```bash
COMPOSE_FILES="-f compose.yaml -f infra/compose/compose.production.yaml" \
  make config
```

Start the deployment:

```bash
docker compose -f compose.yaml \
  -f infra/compose/compose.production.yaml \
  --env-file .env up -d
```

Caddy publishes ports 80 and 443 and also forwards WebSockets to the app. MongoDB and Redis publish no host ports and share only the internal `underleaf_app_backend` network with the application. Data is stored in named Docker volumes. Production restart policies and limits are operational safeguards, not subscription or commercial feature tiers. See [Security](../../docs/SECURITY.md) and [Installation](../../docs/INSTALLATION.md) for deployment restrictions.
