#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
env_file="${ENV_FILE:-$repo_root/.env}"
backup_dir="${BACKUP:-}"
confirmed=false

for argument in "$@"; do
  case "$argument" in
    --yes)
      confirmed=true
      ;;
    --*)
      echo "Unknown option: $argument" >&2
      exit 2
      ;;
    *)
      if [[ -n "$backup_dir" ]]; then
        echo "Backup directory supplied more than once." >&2
        exit 2
      fi
      backup_dir="$argument"
      ;;
  esac
done

if [[ -z "$backup_dir" ]]; then
  echo "Usage: $0 BACKUP_DIRECTORY --yes" >&2
  exit 2
fi
if [[ "$confirmed" != true ]]; then
  echo "Restore replaces MongoDB and application data. Re-run with --yes." >&2
  exit 2
fi

for required_file in manifest.json mongo.archive.gz app-data.tar.gz checksums.sha256; do
  if [[ ! -f "$backup_dir/$required_file" ]]; then
    echo "Backup is missing $required_file: $backup_dir" >&2
    exit 1
  fi
done

if ! grep -q '"format_version": 1' "$backup_dir/manifest.json"; then
  echo "Unsupported backup format." >&2
  exit 1
fi
(cd "$backup_dir" && sha256sum --check checksums.sha256)

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

compose stop app >/dev/null
restore_failed=true
cleanup() {
  if [[ "$restore_failed" == true ]]; then
    compose up -d --no-build app >/dev/null || true
  fi
}
trap cleanup EXIT

compose exec -T mongo mongorestore --drop --archive --gzip \
  < "$backup_dir/mongo.archive.gz"
compose run --rm --no-deps --entrypoint sh app -c \
  'for entry in /var/lib/overleaf/data/*; do if [ -d "$entry" ]; then find "$entry" -mindepth 1 -delete; else rm -f "$entry"; fi; done; tar -xzf - -C /var/lib/overleaf' \
  < "$backup_dir/app-data.tar.gz"

compose up -d --no-build app >/dev/null
restore_failed=false
echo "Underleaf backup restored: $backup_dir"
