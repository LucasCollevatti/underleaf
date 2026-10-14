# Security audit baseline

Date: 2026-10-14

This file records the security baseline established after the SaaS/enterprise
surface reduction. Security checks are run explicitly on a developer or
release machine; the repository does not rely on GitHub Actions for auditing.

## Current verification status

On 2026-10-14, the checksum discrepancies for `@replit/codemirror-emacs` and
`@replit/codemirror-vim` were resolved by pinning both dependencies to their
commit-specific GitHub codeload archives and regenerating their lockfile
checksums. `corepack yarn install --immutable --mode=skip-build` then completed
successfully. A full `corepack yarn install --immutable` reached the link step,
but this Windows host could not build native packages (`cpu-features` and
`mmmagic`); that is a host toolchain failure, not a lockfile or checksum
failure.

The current Docker stack is healthy and `/login` returned HTTP 200. The
compiler image was not rebuilt in this run because the official 2.35 GB TeX
Live layer was being transferred at an unusable rate; the existing compiler
image remained healthy and passed the compiler, boundary and sandbox smoke
tests. This is evidence for the current running stack, not a claim that a new
compiler image was built. The generated SBOM and license inventory are in
`artifacts/` for this checkout.

## Dependency findings

On 2026-10-14, the current full-tree audit with
`corepack yarn npm audit --all --recursive --severity moderate --json` reported
0 critical, 1 high, 52 moderate and 0 low findings. The high finding is
`braces@3.0.3` through `micromatch@4.0.8`, used by the web development/tooling
tree. The upstream advisory currently has no patched `braces` release, so the
full repository audit is not clean. The production-focused audit inside the
rebuilt `underleaf/app:local` image completed with exit code 0 at severity high,
with no high or critical runtime finding.

The high finding is tracked explicitly rather than hidden through an audit
ignore. Re-run the full-tree audit when `braces` publishes a fixed release and
remove the exception from this review. The direct and transitive remediation
included `@xmldom/xmldom` 0.9.12, `axios` 1.20.0, `handlebars` 4.7.10,
`nodemailer` 10.1.1, `compression` 1.8.2, `webpack-dev-middleware` 7.4.5,
`multer` 2.4.0 with the repository's security patch, and refreshed vulnerable
transitives. The previous baseline also removed unused `knip` and
`prettier-plugin-groovy` descriptors.

## Build and test evidence

Passed on 2026-10-14:

- immutable Yarn resolution, fetch and link validation with
  `corepack yarn install --immutable --mode=skip-build`
- reproducible public quality gate: `corepack yarn format`,
  `corepack yarn lint` using `eslint.config.mjs`, and
  `corepack yarn type-check` using `services/web/tsconfig.underleaf.json`
- `corepack yarn workspace @overleaf/web webpack:production`; the production
  build completed successfully with explicit performance budgets. On-demand
  MathJax, Pyodide and Hunspell assets, plus hidden source maps, are excluded
  from the application-bundle budget.
- focused frontend Mocha test for `PdfCompileTime`: 3 tests passed through the
  Node/PnP `.tsx` loader
- `corepack yarn workspace @overleaf/web test:frontend --grep Underleaf`:
  all 49 Underleaf frontend tests passed against the current shell, setup,
  administration, status and local-collaboration UI
- `docker compose --env-file .env build base`
- `docker compose --env-file .env build app`
- Compose security, compiler-boundary, compiler-sandbox and compiler smoke
  tests
- persistence smoke test after recreating the app container
- application health checks and `/login` HTTP probe
- focused Underleaf unit tests: 7 files and 86 tests passed, with no unhandled
  errors

Not approved by this run:

- full `corepack yarn install --immutable`: native package builds failed on the
  local Windows toolchain after checksum and fetch validation succeeded
- authenticated dashboard/editor/sharing smoke tests: credentials were not
  supplied

## Runtime findings

- Node.js is installed from the NodeSource 24.x channel in
  `server-ce/Dockerfile-base`.
- MongoDB stays on the compatible 7.0 line but is pinned to `mongo:7.0.43`
  instead of the floating `mongo:7.0` tag.
- Redis stays on the compatible 6.2 line but is pinned to
  `redis:6.2.21-alpine` instead of the floating `redis:6.2` tag.
- Caddy is used by the production overlay as the only public entry point; the
  local stack publishes the app directly on its configured development port.
- The compiler remains a dedicated non-root, read-only container with dropped
  capabilities and resource limits.

## Yarn patches

Every file in `.yarn/patches` must remain referenced by `yarn.lock`.
The security review found that the SAML/OAuth patch files that looked obsolete
are still referenced by lockfile entries, so they are retained. A patch may be
deleted only together with every matching lockfile descriptor and after
`yarn install --immutable` plus the relevant tests pass.

## server-ce provenance and upgrades

The historical `server-ce/hotfix/` distribution tree and its patch-import/build
helpers are not part of the supported Underleaf runtime or release process and
have been removed from HEAD. Provenance remains in Git history, the imported
snapshot/tag, `docs/ORIGIN.md`, `LICENSE` and `THIRD_PARTY_NOTICES.md`.

Underleaf releases are built through the root `Makefile` and supported Compose
configuration. Legacy ShareLaTeX-to-Overleaf migration checks and the upstream
Google Cloud Build pipeline are not supported deployment mechanisms.

## Accepted residual risk

Local release review must classify each CRITICAL, HIGH and MODERATE advisory by
package/version, runtime exposure, available mitigation, regression risk,
owner and expiry. Fixable runtime CRITICAL/HIGH findings block release. A
temporary exception must identify the advisory/CVE, affected component,
exposure, mitigation, owner and expiry date in this file before acceptance.

### Temporary exception: `braces@3.0.3`

- **Advisory:** [GHSA-vfj7-8cjw-p6xm](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm), also tracked as CVE-2026-93687.
- **Affected component:** `braces@3.0.3`, reached through `micromatch@4.0.8`.
- **Exposure:** The vulnerable locator is present in the full Yarn tree through
  Storybook, Sass, Stylelint, Tailwind and webpack development tooling. It is
  not part of the production dependency focus used by the application image;
  the production-focused high-severity audit completed with exit code 0.
- **Mitigation:** Keep the immutable lockfile, keep development tooling out of
  the production focus, do not feed attacker-controlled brace patterns to the
  build tooling, and rerun the full recursive audit at every release review.
- **Justification:** The advisory affects all released `braces` versions
  through 3.0.3 and currently lists no patched release. A forced fork or
  unreviewed replacement would introduce maintenance and regression risk in
  build tooling while the production runtime audit is clean at high severity.
- **Responsible owner:** Lucas Collevatti, repository owner, with the
  Underleaf maintainers.
- **Accepted until / re-evaluation:** 2026-11-14. Re-evaluate earlier if a
  patched `braces` release, a new exploit path, or a production dependency
  path appears. Acceptance expires automatically on that date unless renewed
  with fresh audit evidence.
- **Exit condition:** Upgrade to a patched release or remove the affected
  development dependency path, then remove this exception and regenerate the
  audit evidence.
