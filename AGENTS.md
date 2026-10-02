# AGENTS.md

## Project Overview

**Underleaf** is a self-hosted collaborative LaTeX editing platform derived from the open-source Overleaf Community Edition.

The project starts from a snapshot of Overleaf Community Edition, but **Underleaf is not intended to remain architecture-compatible with upstream Overleaf**.

The Overleaf codebase is being used as a mature functional foundation for:

- LaTeX project management
- collaborative editing
- document synchronization
- LaTeX compilation
- PDF preview
- SyncTeX
- project history
- file management
- real-time collaboration

From that foundation, Underleaf is expected to become a simpler, cleaner and independently structured product.

Do not preserve Overleaf architecture, naming, directory layout, APIs, services, abstractions, or implementation choices merely for upstream compatibility.

There is no requirement to merge future Overleaf releases.

The goal is:

> Preserve the useful functionality and mature behavior of Overleaf Community Edition while progressively turning the codebase into a simpler, independent, self-hosted product.

---

# Product Vision

Underleaf should feel like a private, lightweight Overleaf installation for trusted environments.

Typical installations include:

- home servers
- laboratories
- universities
- research groups
- engineering teams
- small companies
- private networks

Underleaf is not intended to reproduce the Overleaf SaaS business model.

It does not need:

- subscriptions
- billing
- paid plans
- institutional sales features
- public registration
- marketing pages
- email confirmation
- email-based invitations
- SaaS-specific restrictions

The intended experience is:

1. An administrator deploys Underleaf using Docker.
2. The administrator creates users.
3. Users log in using a username and password.
4. Users create or import LaTeX projects.
5. Users edit documents using a high-quality browser editor.
6. Documents are compiled on the Underleaf server.
7. PDFs are displayed directly next to the editor.
8. Users can collaborate with other existing Underleaf users.
9. Projects and history persist independently of containers.
10. The entire installation can be backed up and restored.

---

# Core Product Principles

## 1. Self-hosted first

Underleaf must be designed primarily for self-hosting.

A production installation should eventually be possible using:

```bash
git clone <repository>
cd underleaf
cp .env.example .env
docker compose up -d
```

The repository must contain everything required to operate Underleaf.

Do not create a separate infrastructure repository unless there is an exceptional technical reason.

---

## 2. Infrastructure belongs in this repository

Docker, Compose files, reverse-proxy configuration, build files, database initialization, backup scripts and deployment documentation belong in the main Underleaf repository.

Preferred repository organization:

```text
underleaf/
├── apps/
├── packages/
├── infra/
├── scripts/
├── docs/
├── tests/
├── compose.yaml
├── .env.example
├── Makefile
├── package.json
├── README.md
├── AGENTS.md
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

The exact structure may evolve.

Do not preserve the original Overleaf directory structure simply because it existed upstream.

---

## 3. Functional preservation before architectural replacement

When refactoring functionality inherited from Overleaf:

1. understand the existing behavior;
2. identify tests or observable behavior;
3. move/refactor the code;
4. verify that behavior still works;
5. only then simplify or replace implementation.

Do not perform large rewrites without first establishing behavioral equivalence.

Prefer incremental migrations.

Every significant architectural step should leave the application in a runnable state.

---

## 4. Underleaf is independent from Overleaf upstream

Do not optimize changes for future upstream merges.

Do not introduce compatibility layers only to make future Overleaf rebases easier.

Do not retain awkward architecture merely because upstream uses it.

Code inherited from Overleaf may be:

- moved
- renamed
- consolidated
- simplified
- rewritten
- removed

when doing so improves Underleaf.

However, retain required copyright notices, licenses and attribution.

---

# Licensing and Origin

Underleaf is derived from Overleaf Community Edition.

The imported Overleaf revision must be documented in:

```text
docs/ORIGIN.md
```

The document should include at minimum:

- original repository URL
- imported commit SHA
- import date
- original license
- notes about substantial modifications

Do not remove applicable copyright notices from inherited source files.

Maintain:

```text
LICENSE
THIRD_PARTY_NOTICES.md
docs/ORIGIN.md
```

Do not use Overleaf trademarks as Underleaf branding.

The product name is:

```text
Underleaf
```

---

# Target User Experience

## Authentication

Users log in with:

```text
Username
Password
```

Email must not be required.

There should be no public registration.

There should be no email confirmation workflow.

There should be no password reset via email requirement.

Administrators manage accounts.

Target user fields:

```text
id
username
passwordHash
displayName
role
status
createdAt
updatedAt
lastLoginAt
```

Potential roles:

```text
admin
user
```

Potential status values:

```text
active
disabled
```

Usernames must be unique.

Username comparison should be normalized consistently.

Never store plaintext passwords.

Use an established password hashing mechanism such as Argon2id or another project-approved secure password hashing implementation.

---

# Administrator Experience

Underleaf requires a minimal administration interface.

Target route:

```text
/admin
```

Administrative functionality should include:

- list users
- create users
- reset passwords
- change username
- enable users
- disable users
- promote user to administrator
- remove administrator privileges
- delete users
- inspect basic system health

Deleting a user must explicitly define what happens to projects owned by that user.

Never silently delete user projects as a side effect of account deletion.

Possible options:

```text
transfer projects
delete projects
cancel operation
```

---

# Initial Administrator

A fresh Underleaf installation must support bootstrapping the first administrator without public signup.

Prefer a CLI workflow such as:

```bash
docker compose exec app underleaf create-admin
```

or:

```bash
./scripts/create-admin.sh
```

Do not introduce default credentials.

Do not automatically create a predictable administrator password.

---

# Project Dashboard

The default authenticated interface should primarily show projects.

Target experience:

```text
Underleaf

Projects

[ New Project ] [ Import ZIP ]

Search projects...

My Thesis
Research Paper
Circuit Analysis
```

Core project features:

- create
- rename
- open
- archive
- delete
- duplicate
- import ZIP
- export ZIP

Useful project filters may include:

- all
- owned by me
- shared with me
- archived

Avoid unnecessary SaaS-oriented dashboard elements.

---

# Editor

The editor is one of the most important parts of Underleaf.

Preserve mature behavior whenever practical.

Target layout:

```text
┌──────────────┬──────────────────────────┬─────────────────────┐
│ Files        │ Editor                   │ PDF                 │
│              │                          │                     │
│ main.tex     │ \documentclass{...}      │                     │
│ refs.bib     │                          │                     │
│ figures/     │                          │                     │
│              │                          │                     │
└──────────────┴──────────────────────────┴─────────────────────┘
```

Important functionality:

- file tree
- folders
- multiple files
- text editor
- LaTeX syntax highlighting
- autocomplete
- search and replace
- upload
- image assets
- `.bib` files
- compile command
- compile logs
- error reporting
- PDF preview
- SyncTeX
- editor-to-PDF synchronization
- PDF-to-source synchronization where supported
- real-time collaboration

Do not rewrite complex editor behavior without a clear reason.

A good refactor is preferable to an unnecessary rewrite.

---

# LaTeX Compilation

Underleaf should provide a broad server-side LaTeX environment.

The long-term default environment should use a full TeX Live installation.

Target support includes:

```text
pdfLaTeX
XeLaTeX
LuaLaTeX
latexmk
BibTeX
Biber
makeindex
```

and commonly used packages including, but not limited to:

```text
TikZ
PGFPlots
Circuitikz
Minted
Fontspec
BibLaTeX
Chemfig
```

Prefer a dedicated compiler image.

Example conceptual structure:

```text
infra/
└── docker/
    ├── app.Dockerfile
    └── compiler.Dockerfile
```

The compiler image may be large.

Image size is less important than a reliable and complete LaTeX environment.

---

# Compiler Isolation

Compilation must eventually be isolated from the main application.

Conceptual architecture:

```text
Browser
   │
   ▼
Underleaf App
   │
   │ internal API
   ▼
Compiler
   │
   ▼
TeX Live
```

The compiler must not receive application secrets unnecessarily.

Do not expose:

- database credentials
- session secrets
- API secrets
- SSH keys
- infrastructure credentials

to LaTeX compilation processes.

The compiler should run with minimal privileges.

Prefer:

- non-root execution
- temporary compilation directories
- isolated filesystem
- no Docker socket
- internal-only networking
- explicit CPU limits
- explicit memory limits
- configurable timeout

---

# Compilation Limits

Underleaf should not impose artificial SaaS/paywall limits.

However, infrastructure safeguards are required.

Compilation timeout should be configurable.

Example:

```env
UNDERLEAF_COMPILE_TIMEOUT=3600
```

Resource limits should also be configurable.

Example:

```env
UNDERLEAF_COMPILE_CPUS=4
UNDERLEAF_COMPILE_MEMORY=8G
```

A resource limit is an infrastructure safeguard, not a product-tier restriction.

Do not allow accidental infinite compilation to permanently consume server resources.

---

# Collaboration

Users should collaborate using existing Underleaf accounts.

Sharing should use usernames rather than email addresses.

Target interaction:

```text
Share Project

Search user:
[ lucas____________ ]

lucas
luciano
luciana
```

Target project roles:

```text
owner
editor
viewer
```

Do not require:

- email invitations
- invitation emails
- pending email confirmation
- magic links

If a user exists, permission can be granted directly.

If a user does not exist, report that clearly.

---

# Real-Time Editing

Real-time collaborative editing is a core feature.

Preserve or replace inherited Overleaf collaboration functionality carefully.

Behavior to protect:

- simultaneous edits
- operation ordering
- reconnect behavior
- conflict handling
- document synchronization
- user presence where available

Do not simplify collaboration logic without tests demonstrating equivalent behavior.

---

# History

Projects should retain revision history.

Minimum useful behavior:

- timestamp
- user responsible for change
- revision information
- restore previous state

History storage must be included in backup and restore procedures.

---

# Database and Storage

The initial Underleaf architecture may continue to use technologies inherited from Overleaf, including:

```text
MongoDB
Redis
```

Do not replace foundational persistence technology casually.

Database replacement requires:

- clear technical justification
- migration plan
- backup strategy
- compatibility testing
- rollback strategy

Persistent data must never depend on container lifecycle.

---

# Docker Architecture

The complete application must run through Docker Compose.

Conceptual services:

```text
proxy
app
compiler
mongodb
redis
```

Only services that require external access should expose host ports.

Typically:

```text
proxy:
  80
  443
```

Do not expose MongoDB publicly.

Do not expose Redis publicly.

Do not expose compiler APIs publicly.

Use internal Docker networks.

---

# Development and Production

Prefer a base Compose configuration plus environment-specific overlays.

Example:

```text
compose.yaml

infra/
└── compose/
    ├── compose.dev.yaml
    └── compose.prod.yaml
```

The project should eventually support commands such as:

```bash
make dev
make build
make test
make up
make down
make logs
make backup
make restore
```

Commands must be documented.

Avoid hidden manual deployment steps.

---

# Configuration

Runtime configuration should use environment variables where appropriate.

Maintain:

```text
.env.example
```

Never commit real secrets.

Every configuration variable must have:

- a meaningful name
- documented purpose
- safe default when possible

Fail fast when required secrets or configuration are missing.

Avoid silent fallback to insecure defaults.

---

# Backups

Backup and restore are first-class features.

A valid backup must include everything necessary to recover user data.

At minimum consider:

- database
- project files
- history
- relevant application metadata

A backup implementation is not complete until restore has been tested.

Required validation scenario:

1. create user;
2. create project;
3. edit project;
4. compile project;
5. create backup;
6. destroy persistent test data;
7. restore backup;
8. verify user exists;
9. verify project exists;
10. verify history exists;
11. compile project again.

Never claim backup support based only on successfully creating an archive.

---

# Security Model

Underleaf primarily targets environments where users are trusted.

This reduces some multi-tenant threat requirements but does not eliminate basic security responsibilities.

Always consider:

- least privilege
- secure password storage
- CSRF protection
- secure session cookies
- input validation
- login rate limiting
- dependency vulnerabilities
- container isolation
- network boundaries
- secret management
- filesystem permissions
- backup confidentiality

Never expose the Docker socket to application or compiler containers without an explicit architectural requirement.

Never hardcode secrets.

Never log:

- plaintext passwords
- password hashes
- session tokens
- authentication cookies
- secret environment variables

Avoid logging document contents unless specifically required for debugging and explicitly enabled.

---

# Observability

Application logs should be structured and useful.

Useful context includes:

```text
timestamp
level
service
requestId
userId
projectId
message
```

Do not put sensitive information into logs.

Useful system health information may eventually include:

- application status
- compiler status
- MongoDB status
- Redis status
- available disk
- running compilations
- compilation queue
- application version

---

# Repository Architecture

The target repository should become domain-oriented.

Preferred high-level layout:

```text
underleaf/
│
├── apps/
│   ├── web/
│   ├── compiler/
│   ├── collaboration/
│   ├── history/
│   └── storage/
│
├── packages/
│   ├── auth/
│   ├── config/
│   ├── database/
│   ├── logger/
│   ├── shared/
│   ├── types/
│   └── ui/
│
├── infra/
│   ├── docker/
│   ├── compose/
│   ├── proxy/
│   └── scripts/
│
├── scripts/
│
├── docs/
│
├── tests/
│
├── compose.yaml
├── Makefile
├── package.json
├── .env.example
├── README.md
├── AGENTS.md
├── LICENSE
└── THIRD_PARTY_NOTICES.md
```

This is a target, not an instruction to perform a blind massive move.

Migrate incrementally.

---

# Architectural Simplification

Underleaf does not need to retain every Overleaf microservice.

When evaluating an inherited service, ask:

1. What responsibility does it provide?
2. Is isolation technically necessary?
3. Does it have independent scaling requirements?
4. Does it have different security boundaries?
5. Does keeping it separate reduce or increase complexity?

If separation does not provide meaningful value, consolidation is acceptable.

Prefer a smaller number of understandable components over unnecessary distributed-system complexity.

The compiler is an exception: maintaining a separate compilation boundary is strongly preferred because of security and resource isolation requirements.

---

# Coding Principles

Prefer:

- simple code
- explicit code
- small focused modules
- clear ownership of responsibilities
- strong typing
- predictable control flow
- meaningful names
- small focused functions
- low coupling
- minimal side effects
- guard clauses when they improve readability

Avoid:

- clever abstractions
- speculative generalization
- hidden side effects
- duplicated business logic
- vague utility modules
- unnecessary dependencies
- giant refactors unrelated to the requested task
- commented-out dead code
- meaningless comments
- magic constants

Do not rewrite unrelated code while implementing a focused task.

Make the smallest safe change that moves the architecture toward the intended target.

---

# TypeScript

Where TypeScript is used:

- prefer strict types;
- avoid unnecessary `any`;
- model domain concepts explicitly;
- validate data crossing process/API boundaries;
- prefer discriminated unions where appropriate;
- avoid duplicated interface definitions across packages.

Shared types should live in an appropriate shared package when they genuinely cross boundaries.

Do not create a shared abstraction merely because two pieces of code currently look similar.

---

# React

For frontend code:

- keep components focused;
- separate business logic from presentation when practical;
- avoid unnecessary global state;
- avoid deeply nested prop drilling when an existing project pattern solves the problem cleanly;
- preserve accessibility;
- preserve keyboard navigation;
- handle loading and error states explicitly.

Do not change established interaction behavior without understanding why it exists.

The editor is a high-complexity area. Treat modifications carefully.

---

# APIs

API design should be predictable.

Prefer resource-oriented routes where practical.

Examples:

```text
POST   /api/auth/login
POST   /api/auth/logout
GET    /api/auth/session

GET    /api/users
POST   /api/users
PATCH  /api/users/:id
DELETE /api/users/:id

GET    /api/projects
POST   /api/projects
GET    /api/projects/:id
PATCH  /api/projects/:id
DELETE /api/projects/:id
```

Do not expose internal service implementation details unnecessarily through public APIs.

Validate all external input.

Return consistent errors.

---

# Database Changes

Schema changes require migrations or documented migration procedures.

Never silently introduce incompatible persistent-data changes.

Any destructive migration requires:

- backup guidance
- migration path
- validation
- rollback consideration

Development convenience is not sufficient justification for losing persisted projects.

---

# Tests

Behavior changes require tests.

Prioritize tests around:

- authentication
- authorization
- users
- projects
- collaboration
- compilation
- storage
- history
- backup/restore

For bugs:

1. reproduce the bug;
2. add a failing regression test when practical;
3. fix the bug;
4. verify the test passes.

Do not delete tests merely because a refactor causes them to fail.

Determine whether behavior changed intentionally first.

---

# Refactoring Rules

Large inherited modules should be migrated gradually.

Preferred sequence:

```text
understand
→ characterize behavior
→ add/identify tests
→ move
→ rename
→ verify
→ simplify
→ verify again
```

Avoid simultaneous:

```text
move + rewrite + behavior change + dependency replacement
```

unless unavoidable.

Those changes are difficult to review and difficult to debug.

---

# Dependency Policy

Before introducing a dependency, determine whether existing project dependencies already solve the problem.

Prefer mature, maintained libraries.

Avoid adding packages for trivial functionality.

Pin or lock dependencies using the repository's established dependency management strategy.

Security-sensitive dependencies require additional scrutiny.

---

# Documentation

Important architectural decisions should be documented.

Maintain at least:

```text
docs/ARCHITECTURE.md
docs/DEVELOPMENT.md
docs/DEPLOYMENT.md
docs/BACKUP.md
docs/SECURITY.md
docs/ORIGIN.md
```

Documentation must describe the current system rather than an aspirational system unless clearly marked as planned.

Update documentation when architecture changes.

---

# Milestone Strategy

Development should proceed in functional milestones.

## M0 — Overleaf Import Baseline

Goal:

Import a known Community Edition snapshot and prove it works before changing architecture.

Required:

- record upstream commit
- preserve licensing
- build succeeds
- application starts
- login works
- project creation works
- editor works
- PDF compilation works

Create a permanent baseline tag.

Suggested:

```text
v0.0.0-overleaf-import
```

---

## M1 — Underleaf Docker Baseline

Goal:

Run the imported application entirely using infrastructure contained in this repository.

Required:

- root `compose.yaml`
- application container
- MongoDB
- Redis
- persistent volumes
- health checks
- reproducible startup

---

## M2 — Repository Reorganization

Goal:

Move toward the Underleaf repository structure without intentionally changing behavior.

Target concepts:

```text
apps/
packages/
infra/
scripts/
docs/
tests/
```

Keep the application runnable throughout migration.

---

## M3 — Product Identity

Goal:

Turn visible product identity into Underleaf.

Required:

- Underleaf name
- logo
- favicon
- page titles
- metadata
- README
- About information

Remove unnecessary visible Overleaf SaaS references.

---

## M4 — Remove Unwanted Product Features

Remove functionality not needed by Underleaf.

Candidates include:

- public registration
- email confirmation
- subscription UI
- billing
- pricing
- SaaS marketing
- unused identity providers
- institution-specific flows
- unused cloud integrations

Verify dependencies before deleting modules.

---

## M5 — Username-Based Users

Goal:

Make username the canonical login identifier.

Required:

- unique username
- password hash
- role
- account status
- no required email

Provide migration logic if existing imported development users exist.

---

## M6 — Authentication Simplification

Required:

- username/password login
- logout
- sessions
- CSRF protection
- secure cookies
- login rate limiting

Remove dependence on email-based authentication workflows.

---

## M7 — Administrator Bootstrap

Required:

- CLI or equivalent first-admin creation
- no default credentials
- no public initialization endpoint

---

## M8 — Administration Interface

Required:

- users list
- create user
- reset password
- enable/disable
- admin role management
- delete user
- explicit project disposition when deleting users

---

## M9 — Project Dashboard

Provide a minimal project-first authenticated home.

Required:

- list
- search
- create
- rename
- delete
- archive
- duplicate
- ZIP import/export

---

## M10 — Editor Stabilization

Preserve and validate:

- editor
- file tree
- upload
- syntax highlighting
- autocomplete
- PDF preview
- logs
- errors
- SyncTeX

---

## M11 — Dedicated Compiler

Move compilation toward an explicit Underleaf compiler component.

The compiler should have a clear internal interface and independent container.

---

## M12 — Full TeX Live

Provide a comprehensive TeX Live installation.

Verify:

- pdfLaTeX
- XeLaTeX
- LuaLaTeX
- BibTeX
- Biber
- latexmk
- common package families

---

## M13 — Compiler Isolation

Ensure compilation has an appropriate security boundary.

Required:

- non-root where practical
- no Docker socket
- no application secrets
- temporary workspace
- configurable CPU/RAM/time limits

---

## M14 — Collaboration by Username

Required:

- search existing users
- owner/editor/viewer roles
- direct sharing
- no email invitation dependency

---

## M15 — Real-Time Collaboration Validation

Verify:

- concurrent editing
- operation synchronization
- reconnect
- conflict handling
- user presence where applicable

---

## M16 — History

Required:

- revision history
- user attribution
- restore

---

## M17 — Persistence Cleanup

Clearly document and organize all persistent data.

Nothing important should disappear when containers are recreated.

---

## M18 — Backup and Restore

Required:

- backup command
- restore command
- documented backup format
- automated or repeatable restore test

---

## M19 — Observability

Required:

- health endpoints/checks
- useful structured logs
- service health visibility
- compiler status
- disk visibility where practical

---

## M20 — Production Docker Setup

Required:

- production Compose configuration
- internal networks
- persistent volumes
- configuration validation
- restart policies
- resource controls where appropriate

---

## M21 — Reverse Proxy and HTTPS

Provide supported reverse proxy configuration.

Only intended web ports should normally be externally reachable.

---

## M22 — Security Baseline

Review:

- authentication
- sessions
- CSRF
- container privileges
- filesystem access
- secrets
- exposed ports
- dependency vulnerabilities
- compiler isolation

---

## M23 — Underleaf 1.0

Version 1.0 should provide a coherent self-hosted product.

Required feature set:

### Users

- username/password login
- administrator-managed users
- roles
- disable accounts
- reset passwords
- no public signup
- no required email

### Projects

- create
- rename
- delete
- archive
- duplicate
- ZIP import/export

### Editor

- multi-file editing
- file tree
- syntax highlighting
- autocomplete
- uploads
- images
- bibliography files
- real-time collaboration

### Compilation

- pdfLaTeX
- XeLaTeX
- LuaLaTeX
- latexmk
- BibTeX
- Biber
- full TeX Live environment

### PDF

- preview
- compilation logs
- errors
- SyncTeX

### Sharing

- username search
- owner
- editor
- viewer

### History

- revisions
- attribution
- restore

### Operations

- Docker Compose deployment
- persistent storage
- admin bootstrap
- health checks
- backup
- restore
- HTTPS support

---

# Post-1.0 Ideas

These are not requirements for the initial product.

Possible future work:

## Templates

- administrator templates
- personal templates
- clone from template

## Git Integration

- project repositories
- commits
- branch support
- external remotes

## Editor Improvements

- themes
- Vim bindings
- snippets
- command palette
- richer autocomplete

## Administrative Features

- optional quotas
- audit log
- system metrics
- settings interface

## Compiler Profiles

Potential profiles:

```text
Fast
Normal
Heavy
```

These should represent resource scheduling rather than commercial plans.

---

# Guidance for Coding Agents

When asked to implement a feature:

1. inspect the relevant current implementation first;
2. understand inherited Overleaf behavior;
3. identify the smallest coherent change;
4. determine which milestone and architectural direction it belongs to;
5. preserve unrelated behavior;
6. add or update tests;
7. update relevant documentation;
8. verify Docker/build behavior when infrastructure is affected.

Do not assume the existing Overleaf implementation is the desired final architecture.

Do not assume the existing implementation is wrong merely because it came from Overleaf.

Use it as evidence of mature behavior, then decide whether its architecture is appropriate for Underleaf.

---

# Avoid These Patterns

Do not:

- rewrite the entire application at once;
- preserve bad architecture solely for upstream compatibility;
- introduce a second infrastructure repository;
- require manual server configuration when it belongs in Docker/IaC;
- add email as a requirement for accounts;
- add public signup;
- add billing or subscription abstractions;
- expose MongoDB or Redis unnecessarily;
- run LaTeX compilation with application secrets;
- mount the Docker socket into compiler containers;
- introduce default passwords;
- hardcode credentials;
- silently delete project data;
- perform destructive database changes without a migration path;
- claim backup support without testing restore;
- combine unrelated large refactors into a feature change.

---

# Definition of Done

A change is not complete merely because the code compiles.

Depending on the change, completion may require:

- implementation
- tests
- lint/typecheck
- build verification
- relevant Docker verification
- migration handling
- documentation
- security review
- manual functional verification

Infrastructure changes should be tested through the actual supported Docker path.

Persistent-data changes should be tested against real persistent volumes or representative test fixtures.

Compilation changes should compile representative LaTeX documents.

Authentication changes should verify both successful and rejected access.

---

# North Star

When architectural choices are unclear, optimize for this:

> Underleaf should provide the excellent collaborative LaTeX editing experience people expect from Overleaf, while being substantially simpler to deploy, understand, administer and maintain in a trusted self-hosted environment.

And apply this implementation rule:

> Preserve mature behavior. Remove unnecessary product complexity. Simplify architecture deliberately. Keep the system runnable after every major step.