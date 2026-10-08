#!/usr/bin/env bash

set -euo pipefail

compose_file=${UNDERLEAF_COMPOSE_FILE:-compose.yaml}
compose_args=(-f "$compose_file")

export UNDERLEAF_SESSION_SECRET=${UNDERLEAF_SESSION_SECRET:-sandbox-session}

docker compose "${compose_args[@]}" create --no-build compiler >/dev/null

cleanup() {
  docker compose "${compose_args[@]}" rm --force compiler >/dev/null 2>&1 || true
}
trap cleanup EXIT

container_id=$(docker compose "${compose_args[@]}" ps -aq compiler)

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

assert.equal(container.Config.User, 'www-data:www-data')
assert.equal(hostConfig.ReadonlyRootfs, true)
assert(hostConfig.CapDrop.includes('ALL'))
assert(hostConfig.SecurityOpt.includes('no-new-privileges:true'))
assert.equal(hostConfig.PidsLimit, 512)
assert(hostConfig.Memory > 0, 'compiler memory limit must be set')
assert(hostConfig.NanoCpus > 0, 'compiler CPU limit must be set')
assert(!container.Mounts.some(mount => mount.Destination === '/var/run/docker.sock'))
assert(!environment.some(variable => /SECRET|PASSWORD|TOKEN|MONGO|REDIS/.test(variable)))

const writableVolumes = container.Mounts
  .filter(mount => mount.RW)
  .map(mount => mount.Destination)
assert.deepEqual(writableVolumes, ['/var/lib/underleaf/compiler'])

const tmpfs = hostConfig.Tmpfs || {}
assert(tmpfs['/tmp'])
assert(tmpfs['/var/lib/underleaf/compiler/texmf-var'])

const networkNames = Object.keys(container.NetworkSettings.Networks)
assert.equal(networkNames.length, 1)
const networks = JSON.parse(
  execFileSync('docker', ['network', 'inspect', networkNames[0]], {
    encoding: 'utf8',
  })
)
assert.equal(networks[0].Internal, true)
NODE

MSYS_NO_PATHCONV=1 docker compose "${compose_args[@]}" run --rm --no-deps --entrypoint /bin/sh compiler -ceu '
  if touch /etc/underleaf-sandbox-write-test 2>/dev/null; then
    echo "compiler root filesystem is writable" >&2
    exit 1
  fi
  test ! -S /var/run/docker.sock
  test ! -d /run/secrets
  ! getent hosts mongo >/dev/null 2>&1
  ! getent hosts redis >/dev/null 2>&1
  test -w /tmp
  test -w /var/lib/underleaf/compiler
'

printf '%s\n' "Underleaf compiler sandbox smoke test passed."
