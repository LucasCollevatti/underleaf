# AGENTS.md

## Project Overview

**Underleaf** is a self-hosted collaborative LaTeX editing platform derived
from an imported snapshot of Overleaf Community Edition.

Underleaf is an independent product. Preserve useful mature behavior, but do
not preserve upstream architecture, naming, services, APIs, abstractions or
directory layout solely for compatibility with Overleaf.

Required provenance and licensing remain documented in:

- `LICENSE`
- `THIRD_PARTY_NOTICES.md`
- `docs/ORIGIN.md`

The product identity is **Underleaf**. Upstream names may remain only where
they are technically or legally meaningful, such as inherited package names,
migration history, copyright notices and provenance records.

## Product Scope

Underleaf is designed for trusted self-hosted environments such as home
servers, laboratories, universities, research groups, engineering teams and
small companies.

The supported product includes:

- administrator-managed local users;
- username/password authentication and sessions;
- LaTeX projects and ZIP import/export;
- the browser editor, file tree and PDF preview;
- server-side LaTeX compilation;
- SyncTeX, logs and compile errors;
- real-time collaboration;
- project sharing between existing users;
- project history;
- persistent Docker volumes;
- backup and restore;
- health checks and operational observability;
- reverse-proxy/HTTPS deployment.

Underleaf does **not** include:

- billing, subscriptions, pricing or paid plans;
- public registration;
- email-based account identity or password recovery;
- SaaS marketing surfaces;
- institutional sales features;
- hosted-product analytics or engagement tracking;
- OAuth/SAML login providers unless explicitly reintroduced by a future
  product requirement.

Do not add abstractions for excluded product concepts.

## Current Repository Layout

The current repository organization is authoritative:

```text
underleaf/
├── apps/
├── bin/
├── compliance/
├── docs/
├── infra/
├── libraries/
├── scripts/
├── server-ce/
├── services/
├── tests/
├── tools/
├── compose.yaml
├── Makefile
├── package.json
├── yarn.lock
├── AGENTS.md
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

Do not create placeholder directories or documentation that promises a future
move without an implementation. Documentation must describe code and runtime
that exist now.

## Runtime Architecture

The supported deployment is defined by the root `compose.yaml` and the
production/development overlays under `infra/compose/`.

The main application runs the inherited web and collaboration services from
`services/` using the runtime integration in `server-ce/`.

LaTeX execution is isolated in the dedicated `compiler` container. The app
uses the internal compiler boundary and does not run CLSI itself. The compiler:

- runs as a non-root user;
- has a read-only root filesystem;
- drops Linux capabilities;
- uses `no-new-privileges`;
- has CPU, memory and PID limits;
- does not receive application secrets;
- does not receive the Docker socket;
- is not attached to the MongoDB/Redis backend network;
- exposes no host port.

MongoDB and Redis are internal runtime dependencies. Public deployment is
normally fronted by the versioned reverse proxy configuration under
`infra/proxy/`.

## Authentication and Accounts

Username is the canonical account identity.

Persist and expose only account fields required by the Underleaf account model.
Do not introduce required email identity, synthetic email addresses, email
confirmation or email-based password recovery.

Authentication is username/password plus the existing session, CSRF and rate
limiting mechanisms. Password hashes are internal and must never be returned in
page metadata or APIs.

There is no public registration. Additional users are created by an
administrator. Password recovery is an administrator reset with the supported
operator CLI as a fallback.

A fresh installation uses the existing `/welcome` bootstrap flow. It must
remain one-time, transactional and protected against concurrent initial
administrator creation.

## Projects, Sharing and Editor

The authenticated product is project-first. Preserve the mature project
management, editor, collaboration, history and PDF behavior unless a change is
explicitly required.

Project sharing is between existing Underleaf users by username. Do not
reintroduce email invitations, commercial plan limits or hosted sharing flows.

The editor is high-complexity inherited code. Prefer small, behavior-preserving
changes over rewrites. Maintain accessibility, keyboard behavior, file-tree
semantics, compilation, logs, PDF preview and SyncTeX.

## Refactoring Rules

Refactoring should make the current code simpler without introducing unrelated
behavior.

Prefer:

- small coherent changes;
- explicit names and ownership;
- focused modules and functions;
- low coupling and minimal side effects;
- deletion of dead product surfaces;
- consolidation only when it reduces real complexity;
- tests around behavior that is being changed.

Avoid:

- speculative abstractions;
- placeholder architecture;
- compatibility layers for hypothetical upstream merges;
- broad rewrites when deletion or extraction is enough;
- dead/commented-out code;
- duplicate business logic;
- unnecessary dependencies.

When inherited code mixes required Underleaf behavior with removed SaaS
concepts, extract the required behavior into a neutral module, migrate callers,
then remove the obsolete module.

## Dependencies and Yarn

The repository uses Yarn 4 with Plug'n'Play.

Keep:

- `yarn.lock`;
- `.yarnrc.yml`;
- `.pnp.register.mjs`;
- referenced files under `.yarn/patches/`.

A Yarn patch may be removed only after every dependency/lockfile descriptor that
references it has been removed and a local immutable install succeeds.

When deleting a feature, remove dependencies, resolutions, patches, types and
tests that are exclusive to that feature in the same coherent change.

Do not add a dependency when existing project code or platform APIs solve the
problem cleanly.

## Local Validation

This repository does not use GitHub Actions for CI.

Validation is performed explicitly on a developer or release machine. Run the
checks appropriate to the change before release, including as applicable:

```sh
yarn install --immutable
yarn lint
yarn format
yarn workspace @overleaf/web type-check
corepack yarn npm audit --all
docker compose -f compose.yaml config --quiet
```

Use the relevant tests and smoke tests under `tests/` for affected behavior.
Infrastructure changes must be validated through the supported Docker path.
Compilation changes must compile representative LaTeX documents. Authentication
changes must exercise both accepted and rejected access.

Do not claim a check passed unless it was actually run.

## Security

Default requirements:

- no hardcoded credentials or secrets;
- least privilege for containers and processes;
- no unnecessary host ports;
- no Docker socket in the compiler;
- no application secrets in LaTeX compilation;
- CSRF protection for state-changing browser requests;
- rate limiting for authentication and abuse-sensitive endpoints;
- structured logs without passwords, hashes, session tokens, secrets or
  document contents;
- explicit validation for external input;
- documented handling for destructive persistent-data changes.

Keep `.gitleaks.toml` and the local security/audit tooling useful even though
checks are not run by GitHub Actions.

## Database and Persistent Data

Schema changes require a migration or an explicit migration procedure.

Never silently introduce incompatible persistent-data changes. Destructive
changes require backup guidance, validation and rollback consideration.

Projects, history and other durable data must survive container recreation.
Backup support means a restore path has been exercised, not merely that an
archive can be created.

## Documentation

Documentation describes the current supported system.

Maintain the documents that explain actual operation, including:

- `docs/ARCHITECTURE.md`
- `docs/DEVELOPMENT.md`
- `docs/DEPLOYMENT.md`
- `docs/BACKUP.md`
- `docs/SECURITY.md`
- `docs/ORIGIN.md`

Do not use permanent documentation as a roadmap for hypothetical architecture.
If implementation changes, update the affected documentation in the same
change.

## Definition of Done

A change is complete only when its implementation and the evidence appropriate
to that change agree.

Depending on scope, that may include:

- tests;
- lint/type checking/formatting;
- immutable dependency installation;
- Docker build/config verification;
- smoke tests;
- migration/rollback checks;
- documentation;
- security review;
- manual functional verification.

All of these checks are local/manual unless the repository explicitly adopts a
different mechanism later.

## Implementation Rule

> Preserve mature behavior that belongs in Underleaf. Remove product complexity
> that does not. Keep the current system understandable and runnable.
