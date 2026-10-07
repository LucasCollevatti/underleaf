# Underleaf compiler service

Compilation is a dedicated runtime service. The web application owns project
authorization, compile limits and request composition, then sends the CLSI
request over the private `compiler_net` network to the `compiler` container.

The compiler container runs `services/clsi/app.js` and is the only supported
runtime path for TeX execution. The main application image no longer starts
CLSI. Generated files live in the `underleaf_compiler_work` volume; the app
mounts that volume read-only so its internal nginx can stream PDF/log artifacts
without executing TeX.

The web-facing contract remains
`UnderleafCompilerGateway`. Its legacy adapter preserves the established
request/result semantics while the process boundary is now enforced by the
deployment topology.

The compiler API is not published on a host port. It can reach the app's
filestore over `compiler_net`, but it is not attached to the MongoDB/Redis
backend network.
