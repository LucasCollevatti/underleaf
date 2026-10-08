COMPOSE ?= docker compose
DOCKER ?= docker
ENV_FILE ?= .env
COMPOSE_FILES ?= -f compose.yaml
BASE_IMAGE ?= underleaf/base:local

.PHONY: config require-base build-base build-web web dev test up down logs health backup restore

config:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) config --quiet

require-base:
	@$(DOCKER) image inspect $(BASE_IMAGE) >/dev/null 2>&1 || { \
		echo "Missing required base image: $(BASE_IMAGE)" >&2; \
		echo "Build it once with: make build-base" >&2; \
		echo "Then rebuild only the app with: make web" >&2; \
		exit 1; \
	}

build-base:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) build base

build-web: require-base
	UNDERLEAF_BASE_IMAGE=$(BASE_IMAGE) \
		$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) build app

web: build-web
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) up -d --no-deps app

build: build-base
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) build app compiler

up:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) build base
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) up --build -d

dev:
	$(COMPOSE) $(COMPOSE_FILES) -f infra/compose/compose.development.yaml --env-file $(ENV_FILE) up -d

test:
	corepack yarn workspace @overleaf/web run test:unit
	corepack yarn workspace @overleaf/clsi run test:unit

down:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) down

logs:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) logs -f app

health:
	ENV_FILE="$(ENV_FILE)" UNDERLEAF_COMPOSE_FILES="$(COMPOSE_FILES)" ./scripts/underleaf-health.sh

backup:
	ENV_FILE="$(ENV_FILE)" UNDERLEAF_COMPOSE_FILES="$(COMPOSE_FILES)" $(if $(BACKUP_DIR),BACKUP_DIR="$(BACKUP_DIR)") ./scripts/underleaf-backup.sh

restore:
	@test -n "$(BACKUP)" || (echo "Use make restore BACKUP=/path/to/backup" >&2; exit 2)
	ENV_FILE="$(ENV_FILE)" UNDERLEAF_COMPOSE_FILES="$(COMPOSE_FILES)" ./scripts/underleaf-restore.sh "$(BACKUP)" --yes
