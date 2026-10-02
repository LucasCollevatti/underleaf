#!/usr/bin/env bash

set -euo pipefail

compose_args=(
  --profile compiler
  -f compose.yaml
  -f infra/compose/compose.production.yaml
)

config_file=$(mktemp)
trap 'rm -f "$config_file"' EXIT

UNDERLEAF_SITE_DOMAIN=${UNDERLEAF_SITE_DOMAIN:-localhost} \
UNDERLEAF_SESSION_SECRET=${UNDERLEAF_SESSION_SECRET:-security-session} \
UNDERLEAF_INVITE_TOKEN_SECRET=${UNDERLEAF_INVITE_TOKEN_SECRET:-security-invite} \
  docker compose "${compose_args[@]}" config --format json >"$config_file"

node - "$config_file" <<'NODE'
const fs = require('node:fs')

const configFile = process.argv[2]
const config = JSON.parse(fs.readFileSync(configFile, 'utf8'))
const services = config.services

const assert = require('node:assert/strict')

assert.deepEqual(services.app.ports ?? [], [])
assert.deepEqual(
  services.proxy.ports.map(port => port.target).sort((a, b) => a - b),
  [80, 443]
)
assert.equal(services.mongo.ports, undefined)
assert.equal(services.redis.ports, undefined)
assert.equal(services.compiler.ports, undefined)
assert.equal(services.compiler.read_only, true)
assert(services.compiler.cap_drop.includes('ALL'))
assert(services.compiler.security_opt.includes('no-new-privileges:true'))

const compilerEnvironment = services.compiler.environment || {}
assert(
  !Object.keys(compilerEnvironment).some(key =>
    /SECRET|PASSWORD|TOKEN|MONGO|REDIS/.test(key)
  )
)

const compilerMounts = services.compiler.volumes || []
assert(
  !compilerMounts.some(mount =>
    String(mount.source || mount).includes('docker.sock') ||
    String(mount.target || mount).includes('docker.sock')
  )
)

console.log('Underleaf security Compose smoke test passed.')
NODE
