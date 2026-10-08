#!/usr/bin/env bash

set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
source "$repo_root/scripts/lib/compose-args.sh"
configure_compose_args "$repo_root/compose.yaml"

exec docker compose "${compose_args[@]}" exec app underleaf create-admin
