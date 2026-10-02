COMPOSE ?= docker compose
DOCKER ?= docker
ENV_FILE ?= .env
COMPOSE_FILES ?= -f compose.yaml

.PHONY: config build-base build dev test up down logs health backup restore

config:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) config --quiet

build-base:
	$(DOCKER) build --file server-ce/Dockerfile-base --tag underleaf/base:local .

build: build-base
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) build app

up:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) up -d

dev:
	$(COMPOSE) $(COMPOSE_FILES) -f infra/compose/compose.development.yaml --env-file $(ENV_FILE) up -d

test:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) exec -T app yarn test

down:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) down

logs:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) logs -f app

health:
	ENV_FILE="$(ENV_FILE)" ./scripts/underleaf-health.sh

backup:
	ENV_FILE="$(ENV_FILE)" ./scripts/underleaf-backup.sh

restore:
	@test -n "$(BACKUP)" || (echo "Use make restore BACKUP=/path/to/backup" >&2; exit 2)
	ENV_FILE="$(ENV_FILE)" ./scripts/underleaf-restore.sh "$(BACKUP)" --yes
