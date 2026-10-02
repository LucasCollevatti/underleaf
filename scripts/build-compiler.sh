#!/usr/bin/env bash

set -euo pipefail

compose_file=${UNDERLEAF_COMPOSE_FILE:-compose.yaml}
exec docker compose --profile compiler -f "$compose_file" build compiler

