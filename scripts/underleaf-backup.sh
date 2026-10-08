#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/lib/compose-args.sh"
env_file="${ENV_FILE:-$repo_root/.env}"
timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
backup_root="${UNDERLEAF_BACKUP_ROOT:-${HOME:-$repo_root}/underleaf-backups}"
backup_dir="${BACKUP_DIR:-$backup_root/underleaf-$timestamp}"
backup_parent="$(dirname -- "$backup_dir")"
staging_dir=""

if [[ -e "$backup_dir" ]]; then
  echo "Backup destination already exists: $backup_dir" >&2
  exit 1
fi
if [[ ! -d "$backup_parent" ]]; then
  mkdir -p -m 700 -- "$backup_parent"
fi

umask 077
staging_dir="$(mktemp -d "$backup_parent/.underleaf-backup.XXXXXX")"
cleanup() {
  if [[ -n "$staging_dir" && -d "$staging_dir" ]]; then
    rm -rf -- "$staging_dir"
  fi
}
trap cleanup EXIT

configure_compose_args "$repo_root/compose.yaml"
if [[ -f "$env_file" ]]; then
  compose_args+=(--env-file "$env_file")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

compose exec -T mongo mongodump --archive --gzip --db sharelatex \
  > "$staging_dir/mongo.archive.gz"
compose exec -T app sh -c \
  'tar -czf - --exclude=data/cache --exclude=data/compiles --exclude=data/output -C /var/lib/overleaf data' \
  > "$staging_dir/app-data.tar.gz"

(cd "$staging_dir" && sha256sum mongo.archive.gz app-data.tar.gz > checksums.sha256.tmp)
mv -- "$staging_dir/checksums.sha256.tmp" "$staging_dir/checksums.sha256"

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
  '}' > "$staging_dir/manifest.json.tmp"
mv -- "$staging_dir/manifest.json.tmp" "$staging_dir/manifest.json"

mv -- "$staging_dir" "$backup_dir"
staging_dir=""

echo "Underleaf backup created: $backup_dir"
