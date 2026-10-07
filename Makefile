COMPOSE ?= docker compose
DOCKER ?= docker
ENV_FILE ?= .env
COMPOSE_FILES ?= -f compose.yaml
WEB_BASE_IMAGE ?= underleaf/base:web
WEB_BASE_UPSTREAM ?= sharelatex/sharelatex-base:latest

.PHONY: config build-base build-web-base build-web web dev test up down logs health backup restore

config:
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) config --quiet

build-base:
	$(DOCKER) build --file server-ce/Dockerfile-base --tag underleaf/base:local .

build-web-base:
	$(DOCKER) build \
		--file server-ce/Dockerfile-web-base \
		--build-arg OVERLEAF_WEB_BASE_TAG=$(WEB_BASE_UPSTREAM) \
		--tag $(WEB_BASE_IMAGE) \
		.

build-web: build-web-base
	UNDERLEAF_BASE_IMAGE=$(WEB_BASE_IMAGE) \
		$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) build app

web: build-web
	$(COMPOSE) $(COMPOSE_FILES) --env-file $(ENV_FILE) up -d --no-deps app

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
	ENV_FILE="$(ENV_FILE)" UNDERLEAF_COMPOSE_FILES="$(COMPOSE_FILES)" ./scripts/underleaf-health.sh

backup:
	ENV_FILE="$(ENV_FILE)" UNDERLEAF_COMPOSE_FILES="$(COMPOSE_FILES)" $(if $(BACKUP_DIR),BACKUP_DIR="$(BACKUP_DIR)") ./scripts/underleaf-backup.sh

restore:
	@test -n "$(BACKUP)" || (echo "Use make restore BACKUP=/path/to/backup" >&2; exit 2)
	ENV_FILE="$(ENV_FILE)" UNDERLEAF_COMPOSE_FILES="$(COMPOSE_FILES)" ./scripts/underleaf-restore.sh "$(BACKUP)" --yes
