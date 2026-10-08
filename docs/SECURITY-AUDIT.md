# Security audit baseline

Date: 2026-10-07

This file records the security baseline established after the SaaS/enterprise
surface reduction. Security checks are run explicitly on a developer or
release machine; the repository does not rely on GitHub Actions for auditing.

## Current verification status

On 2026-10-08, `corepack yarn install --immutable` was attempted before the
dependency audit. It stopped with Yarn `YN0028` because the committed lockfile
would be modified, alongside existing peer-dependency warnings. Therefore the
recursive audit and SBOM generation were **not run** in this checkout: no
current clean-audit or clean-inventory claim is made. Fix the lockfile through
the normal dependency-review process, rerun the immutable install, then retain
the raw audit JSON privately and regenerate both inventory files.

## Dependency findings

On 2026-10-07, `corepack yarn npm audit --all --recursive
--severity moderate --json` reported 2 critical, 43 high, 73 moderate, 0 low
and 22 deprecation findings. These are finding instances rather than a count
of unique packages. The result is not a clean release baseline.

The historical report includes direct or runtime-relevant findings in `axios`,
`@xmldom/xmldom`, `multer`, `nodemailer`, `proxy-addr`, `shell-quote`,
`source-map-js`, `webpack-dev-server` and other transitive packages. The
operator must remediate or explicitly accept each HIGH/CRITICAL finding before
Internet exposure.

The previous baseline change removed the unused `knip` and
`prettier-plugin-groovy` dependencies;
neither has a remaining descriptor in `yarn.lock`. Re-run the audit after any
lockfile change and before release.

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
