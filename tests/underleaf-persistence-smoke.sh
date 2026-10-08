#!/usr/bin/env bash
set -euo pipefail

app_container="${UNDERLEAF_APP_CONTAINER:-underleaf-app}"
compose_file="${COMPOSE_FILE:-compose.yaml}"
env_file="${ENV_FILE:-.env}"
marker_name=".underleaf-persistence-smoke-${BASHPID}"
marker_path="/var/lib/overleaf/data/history/${marker_name}"
marker_value="persistent-${BASHPID}"

cleanup() {
  MSYS_NO_PATHCONV=1 docker exec "$app_container" rm -f "$marker_path" >/dev/null 2>&1 || true
}

trap cleanup EXIT

docker exec "$app_container" sh -c \
  "printf '%s' '$marker_value' > '$marker_path'"

compose_args=(-f "$compose_file")
if [[ -f "$env_file" ]]; then
  compose_args+=(--env-file "$env_file")
fi

docker compose "${compose_args[@]}" up -d --no-build --force-recreate app >/dev/null

actual_value="$(MSYS_NO_PATHCONV=1 docker exec "$app_container" cat "$marker_path")"
if [[ "$actual_value" != "$marker_value" ]]; then
  echo "Persistent history marker was not preserved." >&2
  exit 1
fi

echo "Underleaf persistence smoke test passed."
