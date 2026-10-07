# Security audit baseline

Date: 2026-10-07

This file records the security baseline established after the SaaS/enterprise
surface reduction. It is not a substitute for the automated audit in
`.github/workflows/security-audit.yml`.

## Dependency findings

- `lodash` is constrained by the web workspace to `^4.18.1`. The 2026
  prototype-pollution and template code-injection advisories affect releases
  through 4.17.23 and are fixed in 4.18.0 or later.
- `mongoose` is pinned to 8.24.3. The 2026 prototype-pollution advisory is
  fixed in 8.24.1 or later.
- Stripe/Recurly dependencies are retained because Subscription modules still
  import them. Removing them would make the current tree internally
  inconsistent; removal belongs to a later deletion of the remaining
  subscription backend.
- The repository CI now runs `yarn npm audit --all --recursive --severity
  moderate` against the immutable lockfile.

## Runtime findings

- Node.js is installed from the NodeSource 24.x channel in
  `server-ce/Dockerfile-base`.
- MongoDB stays on the compatible 7.0 line but is pinned to `mongo:7.0.43`
  instead of the floating `mongo:7.0` tag.
- Redis stays on the compatible 6.2 line but is pinned to
  `redis:6.2.21-alpine` instead of the floating `redis:6.2` tag.
- Caddy is not part of the current runtime.
- The compiler remains a dedicated non-root, read-only container with dropped
  capabilities and resource limits.

## Yarn patches

Every file in `.yarn/patches` must remain referenced by `yarn.lock`.
The security review found that the SAML/OAuth patch files that looked obsolete
are still referenced by lockfile entries, so they are retained. A patch may be
deleted only together with every matching lockfile descriptor and after
`yarn install --immutable` plus the relevant tests pass.

## server-ce hotfixes

`server-ce/hotfix` is treated as imported upgrade/provenance material rather
than application runtime code. It is not copied by the current application or
compiler Dockerfiles. The directories are therefore retained for upgrade
history and provenance. They must not be bulk-deleted solely because their
version numbers are old.

## Accepted residual risk

The audit workflow fails on fixable HIGH/CRITICAL vulnerabilities in the
runtime database images and on MODERATE-or-higher npm advisories. A temporary
exception must identify the advisory/CVE, affected component, exposure,
mitigation, owner, and expiry date in this file before being accepted.
