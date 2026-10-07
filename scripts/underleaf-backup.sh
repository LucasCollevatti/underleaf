#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-$repo_root/.env}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_dir="${BACKUP_DIR:-$repo_root/backups/underleaf-$timestamp}"

if [[ -e "$backup_dir" ]] && [[ -n "$(find "$backup_dir" -mindepth 1 -maxdepth 1 -print -quit)" ]]; then
  echo "Backup directory is not empty: $backup_dir" >&2
  exit 1
fi
mkdir -p "$backup_dir"

if [[ -n "${UNDERLEAF_COMPOSE_FILES:-}" ]]; then
  read -r -a compose_args <<< "$UNDERLEAF_COMPOSE_FILES"
else
  compose_args=(-f "${UNDERLEAF_COMPOSE_FILE:-$repo_root/compose.yaml}")
fi
if [[ -f "$env_file" ]]; then
  compose_args+=(--env-file "$env_file")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

compose exec -T mongo mongodump --archive --gzip --db sharelatex \
  > "$backup_dir/mongo.archive.gz"
compose exec -T app tar -czf - \
  --exclude=data/cache \
  --exclude=data/compiles \
  --exclude=data/output \
  -C /var/lib/overleaf data \
  > "$backup_dir/app-data.tar.gz"

(cd "$backup_dir" && sha256sum mongo.archive.gz app-data.tar.gz > checksums.sha256)

revision="unknown"
if revision_value="$(git -C "$repo_root" rev-parse --short HEAD 2>/dev/null)"; then
  revision="$revision_value"
fi

printf '%s\n' \
  '{' \
  '  "format_version": 1,' \
  "  \"created_at\": \"$timestamp\"," \
  "  \"repository_revision\": \"$revision\"," \
  '  "database": "sharelatex",' \
  '  "contents": [' \
  '    "mongo.archive.gz",' \
  '    "app-data.tar.gz",' \
  '    "checksums.sha256"' \
  '  ]' \
  '}' > "$backup_dir/manifest.json"

echo "Underleaf backup created: $backup_dir"
