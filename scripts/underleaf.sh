#!/usr/bin/env bash

set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

source "$repo_root/scripts/lib/compose-args.sh"
configure_compose_args "$repo_root/compose.yaml"

startup_timeout_seconds=${UNDERLEAF_STARTUP_TIMEOUT:-600}

if ! [[ "$startup_timeout_seconds" =~ ^[1-9][0-9]*$ ]]; then
  echo "UNDERLEAF_STARTUP_TIMEOUT must be a positive integer (seconds)." >&2
  exit 2
fi

new_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 32
    return
  fi

  if command -v od >/dev/null 2>&1 && command -v base64 >/dev/null 2>&1; then
    od -An -N32 -tx1 /dev/urandom | tr -d ' \n' | base64
    return
  fi

  echo 'Unable to generate UNDERLEAF_SESSION_SECRET: install openssl.' >&2
  exit 1
}

init_environment() {
  if [[ ! -f .env ]]; then
    cp .env.example .env
  fi

  local current_secret generated_secret temp_file
  current_secret=$(sed -n 's/^UNDERLEAF_SESSION_SECRET=//p' .env)
  if [[ -z "$current_secret" ]]; then
    generated_secret=$(new_secret)
    temp_file=$(mktemp)
    awk -v secret="$generated_secret" '
      /^UNDERLEAF_SESSION_SECRET=/ {
        print "UNDERLEAF_SESSION_SECRET=" secret
        found = 1
        next
      }
      { print }
      END {
        if (!found) print "UNDERLEAF_SESSION_SECRET=" secret
      }
    ' .env > "$temp_file"
    mv "$temp_file" .env
  fi
}

compose() {
  docker compose "${compose_args[@]}" --env-file .env "$@"
}

ensure_environment() {
  init_environment
}

show_help() {
  cat <<'EOF'
Usage: ./scripts/underleaf.sh <command>

Commands:
  init             Create .env and generate the persistent session secret
  config           Validate the merged Compose configuration
  build            Build the base, app and compiler images
  build-compiler   Build the base and official isolated TeX Live compiler image
  up               Build missing images and start Underleaf
  down             Stop Underleaf without deleting volumes
  logs             Follow app logs
  health           Show Compose service health
  create-admin     Create the first administrator interactively
  test             Run the application test command
  backup [PATH]    Create a backup outside the checkout by default
  restore PATH --yes
                   Restore a backup after explicit confirmation
EOF
}

case "${1:-help}" in
  help)
    show_help
    ;;
  init)
    init_environment
    echo "Environment ready: $repo_root/.env"
    ;;
  config)
    ensure_environment
    compose config --quiet
    ;;
  build)
    init_environment
    compose build base
    compose build app compiler
    ;;
  build-compiler)
    init_environment
    compose build base
    compose build compiler
    ;;
  up)
    ensure_environment
    compose build base
    compose up --build --detach --wait --wait-timeout "$startup_timeout_seconds"
    compose ps --all
    ;;
  down)
    ensure_environment
    compose down
    ;;
  logs)
    ensure_environment
    compose logs --follow app
    ;;
  health)
    ensure_environment
    compose ps --all
    ./scripts/underleaf-health.sh
    ;;
  create-admin)
    ensure_environment
    compose exec app underleaf create-admin
    ;;
  test)
    ensure_environment
    corepack yarn workspace @overleaf/web run test:unit
    corepack yarn workspace @overleaf/clsi run test:unit
    ;;
  backup)
    ensure_environment
    if (($# > 2)); then
      echo "Usage: $0 backup [BACKUP_DIRECTORY]" >&2
      exit 2
    fi
    if (($# == 2)); then
      BACKUP_DIR="$2" ./scripts/underleaf-backup.sh
    else
      ./scripts/underleaf-backup.sh
    fi
    ;;
  restore)
    ensure_environment
    shift
    ./scripts/underleaf-restore.sh "$@"
    ;;
  *)
    show_help >&2
    exit 2
    ;;
esac
