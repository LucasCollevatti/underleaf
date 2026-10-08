#!/usr/bin/env bash

set -euo pipefail

repo_root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
cd "$repo_root"

compose_args=(--file compose.yaml --env-file .env)

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
  docker compose "${compose_args[@]}" "$@"
}

show_help() {
  cat <<'EOF'
Usage: ./scripts/underleaf.sh <command>

Commands:
  init             Create .env and generate the persistent session secret
  config           Validate the merged Compose configuration
  build            Build the base, app and compiler images
  build-compiler   Build the base and isolated compiler images
  up               Build missing images and start Underleaf
  down             Stop Underleaf without deleting volumes
  logs             Follow app logs
  health           Show Compose service health
  create-admin     Create the first administrator interactively
  test             Run the application test command
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
    compose config --quiet
    ;;
  build)
    init_environment
    compose build base app compiler
    ;;
  build-compiler)
    init_environment
    compose build base compiler
    ;;
  up)
    init_environment
    compose build base
    compose up --build --detach
    ;;
  down)
    compose down
    ;;
  logs)
    compose logs --follow app
    ;;
  health)
    compose ps --all
    ;;
  create-admin)
    compose exec app underleaf create-admin
    ;;
  test)
    compose exec --no-TTY app yarn test
    ;;
  *)
    show_help >&2
    exit 2
    ;;
esac
