# Security audit baseline

Date: 2026-10-07

This file records the security baseline established after the SaaS/enterprise
surface reduction. Security checks are run explicitly on a developer or
release machine; the repository does not rely on GitHub Actions for auditing.

## Dependency findings

- `lodash` is constrained by the web workspace to `^4.18.1`. The 2026
  prototype-pollution and template code-injection advisories affect releases
  through 4.17.23 and are fixed in 4.18.0 or later.
- `mongoose` is pinned to 8.24.3. The 2026 prototype-pollution advisory is
  fixed in 8.24.1 or later.
- Run `yarn npm audit --all --recursive --severity moderate` locally against
the immutable lockfile when dependencies change and before release.

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

Local release review must treat fixable HIGH/CRITICAL vulnerabilities in the
runtime database images and MODERATE-or-higher npm advisories as blocking unless
an explicit temporary exception must identify the advisory/CVE, affected component, exposure,
mitigation, owner, and expiry date in this file before being accepted.
