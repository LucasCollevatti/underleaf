#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/lib/compose-args.sh"
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

expected_files=(manifest.json mongo.archive.gz app-data.tar.gz checksums.sha256)
if [[ ! -d "$backup_dir" || -L "$backup_dir" ]]; then
  echo "Backup directory is invalid: $backup_dir" >&2
  exit 1
fi
for required_file in "${expected_files[@]}"; do
  if [[ ! -f "$backup_dir/$required_file" ]]; then
    echo "Backup is missing $required_file: $backup_dir" >&2
    exit 1
  fi
  if [[ -L "$backup_dir/$required_file" ]]; then
    echo "Backup contains a symbolic link: $required_file" >&2
    exit 1
  fi
done

actual_entries="$(find "$backup_dir" -mindepth 1 -maxdepth 1 -printf '%y %f\n' | sort)"
expected_entries="$(printf 'f %s\n' "${expected_files[@]}" | sort)"
if [[ "$actual_entries" != "$expected_entries" ]]; then
  echo "Backup contains unexpected or missing top-level entries: $backup_dir" >&2
  exit 1
fi

if ! grep -Eq '^  "format_version": 1,$' "$backup_dir/manifest.json" || \
   ! grep -Eq '^  "database": "sharelatex",$' "$backup_dir/manifest.json"; then
  echo "Unsupported backup format." >&2
  exit 1
fi
manifest_contents="$(awk '
  /^  "contents": \[$/ { inside = 1; next }
  inside && /^  \]$/ { inside = 0; next }
  inside {
    if ($0 !~ /^    "[^"]+",?$/) exit 1
    value = $0
    sub(/^    "/, "", value)
    sub(/",?$/, "", value)
    print value
  }
  END { if (inside) exit 1 }
' "$backup_dir/manifest.json" | sort)"
expected_manifest_contents="$(printf '%s\n' mongo.archive.gz app-data.tar.gz checksums.sha256 | sort)"
if [[ "$manifest_contents" != "$expected_manifest_contents" ]]; then
  echo "Backup manifest contents are invalid." >&2
  exit 1
fi

if ! gzip -t "$backup_dir/mongo.archive.gz" || ! gzip -t "$backup_dir/app-data.tar.gz"; then
  echo "Backup archive validation failed." >&2
  exit 1
fi

validate_tar_paths() {
  local entry
  while IFS= read -r entry; do
    case "$entry" in
      /*|..|../*|*/../*)
        echo "Unsafe path in application archive: $entry" >&2
        return 1
        ;;
    esac
  done < <(tar -tzf "$backup_dir/app-data.tar.gz")
}
validate_tar_paths
(cd "$backup_dir" && sha256sum --check checksums.sha256)

configure_compose_args "$repo_root/compose.yaml"
if [[ -f "$env_file" ]]; then
  compose_args+=(--env-file "$env_file")
fi

compose() {
  docker compose "${compose_args[@]}" "$@"
}

compose exec -T mongo mongosh --quiet --eval 'db.adminCommand({ ping: 1 }).ok' | grep -qx '1'
compose exec -T app sh -c 'test -d /var/lib/overleaf/data'
compose stop app >/dev/null
restore_failed=true
cleanup() {
  if [[ "$restore_failed" == true ]]; then
    compose up -d --no-build app >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

compose exec -T mongo mongorestore --drop --archive --gzip \
  < "$backup_dir/mongo.archive.gz"
compose run --rm --no-deps --entrypoint sh app -c \
  'for entry in /var/lib/overleaf/data/*; do if [ -d "$entry" ]; then find "$entry" -mindepth 1 -delete; else rm -f "$entry"; fi; done; tar -xzf - -C /var/lib/overleaf; rm -rf /var/lib/overleaf/data/compiles /var/lib/overleaf/data/output; if [ -d /var/lib/overleaf/data/cache ]; then find /var/lib/overleaf/data/cache -mindepth 1 -delete; fi' \
  < "$backup_dir/app-data.tar.gz"

compose up -d --no-build app >/dev/null
restore_failed=false
echo "Underleaf backup restored: $backup_dir"
