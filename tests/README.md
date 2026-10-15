# Tests

This directory contains Underleaf integration and operational smoke tests. Imported tests remain in their service and library domains (`services/*/test` and `libraries/*/test`) to preserve their runners and configuration.

The dashboard smoke test runs against an existing installation:

```bash
UNDERLEAF_BASE_URL=http://localhost:18080 \
UNDERLEAF_USERNAME=m7admin \
UNDERLEAF_PASSWORD='your-password' \
node tests/underleaf-project-dashboard-smoke.mjs
```

The editor smoke test checks the IDE page, entity tree, compilation, and PDF, log, and SyncTeX artifacts:

```bash
UNDERLEAF_BASE_URL=http://localhost:18080 \
UNDERLEAF_USERNAME=m7admin \
UNDERLEAF_PASSWORD='your-password' \
node tests/underleaf-editor-smoke.mjs
```

The sharing smoke test verifies authenticated username search, editor/viewer permissions, revocation, and errors for nonexistent accounts:

```bash
UNDERLEAF_BASE_URL=http://localhost:18080 \
UNDERLEAF_USERNAME=m7admin \
UNDERLEAF_PASSWORD='your-password' \
UNDERLEAF_TARGET_USERNAME=another-user \
node tests/underleaf-sharing-smoke.mjs
```

The collaboration smoke test runs inside the web container because it uses the real-time service's `socket.io-client`. It checks concurrent edits, ordering, presence, reconnection, and document recovery:

```bash
docker exec -w /overleaf/services/real-time \
  -e UNDERLEAF_WEB_URL=http://127.0.0.1:4000 \
  -e UNDERLEAF_REALTIME_URL=http://127.0.0.1:3026 \
  -e UNDERLEAF_USERNAME=m7admin \
  -e UNDERLEAF_PASSWORD='your-password' \
  -e UNDERLEAF_TARGET_USERNAME=another-user \
  underleaf-app node test/acceptance/underleaf-collaboration-smoke.mjs
```

The history smoke test also runs inside the web container. It creates a revision, checks its timestamp and author, restores the initial version, and confirms that the restoration produces a new revision:

```bash
docker exec -w /overleaf/services/real-time \
  -e UNDERLEAF_WEB_URL=http://127.0.0.1:4000 \
  -e UNDERLEAF_REALTIME_URL=http://127.0.0.1:3026 \
  -e UNDERLEAF_USERNAME=m7admin \
  -e UNDERLEAF_PASSWORD='your-password' \
  underleaf-app node test/acceptance/underleaf-history-smoke.mjs
```

The persistence smoke test recreates the application container and checks that its history volume retains data:

```bash
./tests/underleaf-persistence-smoke.sh
```

The security smoke test validates production Compose networking, published ports, and compiler isolation:

```bash
./tests/underleaf-security-smoke.sh
```

**Never put real passwords in checked-in scripts or issue reports.** Execute authenticated tests only against a designated test environment and sanitize logs before sharing them.
