#!/usr/bin/env bash

set -euo pipefail

config=$(
  UNDERLEAF_SESSION_SECRET=${UNDERLEAF_SESSION_SECRET:-boundary-session} \
  UNDERLEAF_INVITE_TOKEN_SECRET=${UNDERLEAF_INVITE_TOKEN_SECRET:-boundary-invite} \
    docker compose config --format json
)

node - "$config" <<'NODE'
const assert = require('node:assert/strict')

const config = JSON.parse(process.argv[2])
const { app, compiler } = config.services

assert(compiler, 'compiler service must exist')
assert(!compiler.profiles, 'compiler must be part of the default stack')
assert(!compiler.ports, 'compiler must not publish host ports')
assert.equal(app.environment.CLSI_HOST, 'compiler')
assert.equal(app.environment.FILESTORE_HOST, 'app')
assert(app.depends_on.compiler, 'app must wait for compiler health')
assert(app.networks.underleaf_compiler_net || app.networks.compiler_net)
assert(compiler.networks.underleaf_compiler_net || compiler.networks.compiler_net)
NODE

if grep -q "name: 'clsi'" server-ce/services.js; then
  echo "CLSI is still configured as an app runtime service" >&2
  exit 1
fi

test ! -e server-ce/runit/clsi-overleaf/run

printf '%s\n' "Underleaf compiler boundary smoke test passed."
