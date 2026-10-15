# Underleaf observability

The operational command below outputs a single JSON line without credentials, document contents, or tokens:

```bash
make health
```

The report checks:

- web app, MongoDB, and Redis through internal endpoints and healthchecks;
- project-history, real-time, and CLSI within the application container;
- the dedicated `compiler` service, required by the standard stack for compilation;
- available bytes in the application data volume;
- project-history's pending-flush project count, when that endpoint responds.

The `compiler` must report `healthy`. When it is missing, starting, stopped, or unhealthy, overall status becomes `degraded` and the command exits nonzero. The web app has no embedded fallback compiler; the dedicated service is mandatory.

`scripts/underleaf-health.ps1` produces the same JSON fields and exit-code behavior as `make health`. Both probe internal endpoints, databases/Redis, and the compiler without printing secrets or requiring a Docker socket inside the compiler.

## Logs

Services use structured Bunyan logs including timestamp, severity, and service name. HTTP middleware adds a service-generated `requestId`, or validates the provided `X-Request-Id` (`A-Za-z0-9._-`, up to 128 characters). User and project IDs appear only in existing diagnostic contexts that require them.

Never log passwords, password hashes, secrets, session cookies, tokens, or document contents. The request serializer retains only the HTTP method, URL, IP, operational headers, and routing identifiers necessary for diagnostics.
