#!/usr/bin/env bash

set -euo pipefail

compose_files=${UNDERLEAF_COMPOSE_FILES:-${UNDERLEAF_COMPOSE_FILE:-compose.yaml}}
read -r -a compose_file_list <<< "$compose_files"

compose_args=()
for compose_file in "${compose_file_list[@]}"; do
  compose_args+=(-f "$compose_file")
done

exec docker compose "${compose_args[@]}" exec app underleaf create-admin
