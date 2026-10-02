#!/usr/bin/env bash

set -euo pipefail

compose_file=${UNDERLEAF_COMPOSE_FILE:-compose.yaml}
compose_args=(
  --profile compiler
  -f "$compose_file"
)

UNDERLEAF_SESSION_SECRET=${UNDERLEAF_SESSION_SECRET:-sandbox-session} \
UNDERLEAF_INVITE_TOKEN_SECRET=${UNDERLEAF_INVITE_TOKEN_SECRET:-sandbox-invite} \
  docker compose "${compose_args[@]}" create --no-build compiler >/dev/null

cleanup() {
  UNDERLEAF_SESSION_SECRET=${UNDERLEAF_SESSION_SECRET:-sandbox-session} \
  UNDERLEAF_INVITE_TOKEN_SECRET=${UNDERLEAF_INVITE_TOKEN_SECRET:-sandbox-invite} \
    docker compose "${compose_args[@]}" rm --force compiler >/dev/null 2>&1 || true
}
trap cleanup EXIT

container_id=$(
  UNDERLEAF_SESSION_SECRET=${UNDERLEAF_SESSION_SECRET:-sandbox-session} \
  UNDERLEAF_INVITE_TOKEN_SECRET=${UNDERLEAF_INVITE_TOKEN_SECRET:-sandbox-invite} \
    docker compose "${compose_args[@]}" ps -aq compiler
)

node - "${container_id}" <<'NODE'
const assert = require('node:assert/strict')
const { execFileSync } = require('node:child_process')

const containerId = process.argv[2]
const container = JSON.parse(
  execFileSync('docker', ['inspect', containerId, '--format', '{{json .}}'], {
    encoding: 'utf8',
  })
)
const hostConfig = container.HostConfig
const environment = container.Config.Env || []

assert.equal(container.Config.User, 'www-data')
assert.equal(hostConfig.ReadonlyRootfs, true)
assert(hostConfig.CapDrop.includes('ALL'))
assert(hostConfig.SecurityOpt.includes('no-new-privileges:true'))
assert(!container.Mounts.some(mount => mount.Destination === '/var/run/docker.sock'))
assert(!environment.some(variable => /SECRET|PASSWORD|TOKEN|MONGO|REDIS/.test(variable)))

const networkNames = Object.keys(container.NetworkSettings.Networks)
assert.equal(networkNames.length, 1)
const networks = JSON.parse(
  execFileSync('docker', ['network', 'inspect', networkNames[0]], {
    encoding: 'utf8',
  })
)
assert.equal(networks[0].Internal, true)
NODE

printf '%s\n' "Underleaf compiler sandbox smoke test passed."
