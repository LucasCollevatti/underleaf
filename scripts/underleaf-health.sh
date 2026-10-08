#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/lib/compose-args.sh"
env_file="${ENV_FILE:-$repo_root/.env}"
app_container="${UNDERLEAF_APP_CONTAINER:-underleaf-app}"
mongo_container="${UNDERLEAF_MONGO_CONTAINER:-underleaf-mongo}"
redis_container="${UNDERLEAF_REDIS_CONTAINER:-underleaf-redis}"
timestamp="$(date -u +%Y-%m-%dT%H:%M:%SZ)"

configure_compose_args "$repo_root/compose.yaml"
if [[ -f "$env_file" ]]; then
  compose_args+=(--env-file "$env_file")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

check_app_endpoint() {
  local endpoint="$1"
  docker exec "$app_container" curl --fail --silent --max-time 5 \
    "http://127.0.0.1:3000${endpoint}" >/dev/null 2>&1
}

service_status() {
  local endpoint="$1"
  if check_app_endpoint "$endpoint"; then
    printf 'ok'
  else
    printf 'unhealthy'
  fi
}

app_status="$(service_status /status)"
mongo_status="unhealthy"
if docker exec "$mongo_container" mongosh --quiet --eval \
  'db.adminCommand({ ping: 1 }).ok' 2>/dev/null | grep -qx '1'; then
  mongo_status=ok
fi
redis_status="unhealthy"
if [[ "$(docker exec "$redis_container" redis-cli ping 2>/dev/null || true)" == PONG ]]; then
  redis_status=ok
fi
project_history_status="$(
  if docker exec "$app_container" curl --fail --silent --max-time 5 \
    http://127.0.0.1:3054/check_lock >/dev/null 2>&1; then
    printf 'ok'
  else
    printf 'unhealthy'
  fi
)"
real_time_status="$(
  if docker exec "$app_container" curl --fail --silent --max-time 5 \
    http://127.0.0.1:3026/status >/dev/null 2>&1; then
    printf 'ok'
  else
    printf 'unhealthy'
  fi
)"
compiler_id="$(compose ps -q compiler 2>/dev/null | head -n 1 || true)"
compiler_status="not_started"
if [[ -n "$compiler_id" ]]; then
  compiler_status="$(docker inspect --format '{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}' "$compiler_id" 2>/dev/null || printf 'unhealthy')"
fi
clsi_status="unhealthy"
if [[ -n "$compiler_id" ]] && docker exec "$compiler_id" curl --fail --silent --max-time 5 \
  http://127.0.0.1:3013/status >/dev/null 2>&1; then
  clsi_status=ok
fi

disk_available_bytes="null"
disk_blocks="$(
  MSYS_NO_PATHCONV=1 docker exec "$app_container" df -Pk /var/lib/overleaf/data 2>/dev/null |
    awk 'NR == 2 { print $4 }'
  true
)"
if [[ "$disk_blocks" =~ ^[0-9]+$ ]]; then
  disk_available_bytes=$((disk_blocks * 1024))
fi

queued_projects="null"
queue_response="$(
  docker exec "$app_container" curl --fail --silent --max-time 5 \
    http://127.0.0.1:3054/status/queue 2>/dev/null || true
)"
queue_value="$(
  printf '%s' "$queue_response" |
    sed -n 's/.*"queuedProjects"[[:space:]]*:[[:space:]]*\([0-9][0-9]*\).*/\1/p'
)"
if [[ "$queue_value" =~ ^[0-9]+$ ]]; then
  queued_projects="$queue_value"
fi

overall_status=ok
for status in "$app_status" "$mongo_status" "$redis_status" \
  "$project_history_status" "$real_time_status" "$clsi_status"; do
  if [[ "$status" != ok ]]; then
    overall_status=degraded
  fi
done
if [[ "$compiler_status" != healthy ]]; then
  overall_status=degraded
fi

printf '{"status":"%s","timestamp":"%s","services":{"app":"%s","mongo":"%s","redis":"%s","project_history":"%s","real_time":"%s","clsi":"%s","compiler":"%s"},"metrics":{"disk_available_bytes":%s,"history_queue_projects":%s}}\n' \
  "$overall_status" \
  "$timestamp" \
  "$app_status" \
  "$mongo_status" \
  "$redis_status" \
  "$project_history_status" \
  "$real_time_status" \
  "$clsi_status" \
  "$compiler_status" \
  "$disk_available_bytes" \
  "$queued_projects"

if [[ "$overall_status" != ok ]]; then
  exit 1
fi
