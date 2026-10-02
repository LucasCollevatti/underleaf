COMPOSE ?= docker compose
DOCKER ?= docker
ENV_FILE ?= .env

.PHONY: config build-base build up down logs

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
