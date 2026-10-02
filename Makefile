COMPOSE ?= docker compose
DOCKER ?= docker
ENV_FILE ?= .env

.PHONY: config build-base build up down logs backup restore

config:
	$(COMPOSE) --env-file $(ENV_FILE) config --quiet

build-base:
	$(DOCKER) build --file server-ce/Dockerfile-base --tag underleaf/base:local .

build: build-base
	$(COMPOSE) --env-file $(ENV_FILE) build app

up:
	$(COMPOSE) --env-file $(ENV_FILE) up -d

down:
	$(COMPOSE) --env-file $(ENV_FILE) down

logs:
	$(COMPOSE) --env-file $(ENV_FILE) logs -f app

backup:
	ENV_FILE="$(ENV_FILE)" ./scripts/underleaf-backup.sh

restore:
	@test -n "$(BACKUP)" || (echo "Use make restore BACKUP=/path/to/backup" >&2; exit 2)
	ENV_FILE="$(ENV_FILE)" ./scripts/underleaf-restore.sh "$(BACKUP)" --yes
