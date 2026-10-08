#!/usr/bin/env bash

set -euo pipefail

compose_file=${UNDERLEAF_COMPOSE_FILE:-compose.yaml}
exec docker compose -f "$compose_file" build base compiler

