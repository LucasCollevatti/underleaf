# Development and product test coverage

Read [`AGENTS.md`](../AGENTS.md) before changing Underleaf. This document describes the supported development environment and product contracts.

## Environment

Use the Node.js version required by `package.json` (currently `>=24.18.1`) and the Yarn version pinned in `packageManager` (currently `4.18.0`). From the repository root:

```bash
corepack enable
yarn install --immutable
```

The web runtime remains under `services/web`, with imported packages under `libraries`. The shared shell lives at `services/web/frontend/js/shared/components/underleaf`; Welcome, authentication, administration, and system pages use their respective `underleaf-*` features. Reuse the imported design system's components, contexts, and tokens. The editor retains its established editing, collaboration, and compilation contexts.

To start the application, follow [INSTALLATION.md](INSTALLATION.md). On a fresh instance the normal flow is Welcome → create administrator → automatic login → Projects. The CLI is only an automation/recovery fallback.

## Product invariants

- Users, sessions, search, and public APIs use usernames and do not expose `email`, `emails`, synthetic technical domains, passwords, or hashes. Administrators handle password recovery.
- Welcome, Login, Projects, Settings, Admin, and HTML system pages share the same branded, accessible navigation shell.
- System follows `prefers-color-scheme`; Light and Dark persist on the account. Backend values are `system`, `light-`, and `''`, respectively. Account preferences override a guest's local preferences.
- Guests can change appearance without writing account settings. Brand, wordmark, lockup, and compile-status favicons follow the selected theme.
- Do not reintroduce billing, plans, SaaS submissions, public registration, or email recovery. Preserve copyright, provenance, and licenses.
- Errors retain HTTP status codes and do not disclose internal 5xx details. Session/error HTML fallback works without querying databases or other services.
- HTML `/status` requires administrator access. Public monitoring remains compatible. The page reports the web process and access flags, not MongoDB, Redis, or compiler diagnostics.
- An expired editor session requires explicit login/reload. Canceling logout must preserve local editing backups.

## Test coverage by layer

| Layer | Sources | Contract |
| --- | --- | --- |
| Unit | `services/web/test/unit/src/Underleaf` | Bootstrap, identity, themes, and system rendering |
| Acceptance | `services/web/test/acceptance/src/Underleaf*Tests.mjs` | Real APIs, authorization, transactions, migrations, and setup |
| Frontend | `services/web/test/frontend/features/underleaf-*` and `shared/components/underleaf` | Shell, forms, admin, errors, and preferences |
| Editor | `services/web/test/frontend/features/ide-react/unit/use-status-favicon.test.ts` | Underleaf identity for compile states and imported-code compatibility |
| E2E | `services/web/test/e2e/underleaf/product-journey.cy.js` | Fresh setup, administrator, Projects, editor, users, sharing, themes, login/logout |

When authorized to run tests, install checkout dependencies and execute:

```bash
yarn workspace @overleaf/web run test:unit test/unit/src/Underleaf
TEST_NAME_PATTERN='Underleaf|useStatusFavicon' yarn workspace @overleaf/web run test:frontend
```

Acceptance tests use the existing web-service harness and configuration at `services/web/test/acceptance/config`. Prepare MongoDB with a replica set, Redis, and required services in a **separate test environment**. Never point acceptance tests at the database used by real users. Installation, Welcome, and identity test cases should be part of upgrade and concurrent-bootstrap validation.

## E2E on a disposable installation

The suite uses Cypress from existing web dependencies, with configuration separate from component tests. Install a compatible Chrome browser; Chromium is needed to emulate operating-system theme preferences.

Prepare an empty installation with the same supported services and images. Compose fixes container, volume, and network names: changing `docker compose -p` alone does not isolate the environment. Use a dedicated host/Docker context, or overrides that change **all** shared names and ports.

With the application running, from the repository root:

```bash
UNDERLEAF_E2E_ALLOW_BOOTSTRAP=1 \
UNDERLEAF_E2E_BASE_URL=http://localhost:8080 \
  yarn workspace @overleaf/web run test:product:e2e
```

Explicit opt-in is required: the suite creates a real administrator, account, and project, grants editor access, and resets the test account password. Credentials are random. Preflight checks that `/welcome` is open before creating accounts. It does not delete databases or volumes and cannot reopen an initialized installation. Bootstrap is not retried: rerunning requires another fresh disposable installation. The operator is responsible for cleanup after inspecting test data.

The flow covers empty Projects, creating/opening the editor, admin operations, APIs without email identity fields, direct sharing, collaborator access, administrator password reset, authentication, and closing Welcome after setup. It also covers System/Light/Dark, reload/navigation, OS theme changes, mobile sidebar, status, 404, and logout cancellation. Successful responses are not mocked and application exceptions are not suppressed.

This flow does not replace migration, concurrency, editing/compilation, backup/restore, or restart-persistence checks. The smoke tests under `tests/` and the acceptance harness cover those layers.

## Historical validation notes (2026-10-05)

The closing revision fixed the E2E account creation assertion to expect `201 Created`, matching the API. Last-administrator protection uses the same persistent bootstrap transaction and lock to serialize role/status changes and deletion reservations. Concurrent scenarios live at `services/web/test/acceptance/src/UnderleafAdminSafetyTests.mjs`.

Before cleaning projects and sessions, deletion reserves the account in MongoDB, disables access, and invalidates the previous identity. Optional internal `deletionPending` prevents edits and reactivation (including via CLI) during cleanup. Existing accounts without this field still work; no required data migration. If cleanup fails, the account remains disabled and pending. Fix the failing service and explicitly retry deletion in Users. External cleanup stays outside the transaction to avoid repeating Redis, project, or filesystem side effects during MongoDB retries.

These regressions were added as source changes but were not run during that historical session. The milestone-7 commit supplied test coverage and revised docs; at the maintainer's request, tests, lint, type-check, build, Docker, and browser execution were not performed **in that session**. Historical results do not prove a later revision. Refer to [SECURITY-AUDIT.md](SECURITY-AUDIT.md) for newer recorded checks, and never mark a test suite as passed solely because test code exists.
