# Dependency licensing and SBOM

Underleaf maintains separate machine-readable inventory, notices, and project
license/provenance records.

## Generated artifacts

Run:

```sh
yarn install --immutable
yarn node scripts/compliance/generate-sbom.mjs
```

The command generates:

- `artifacts/sbom.cdx.json`: CycloneDX 1.6 SBOM for installed third-party npm
  packages.
- `artifacts/third-party-licenses.csv`: package/version/license/repository
  inventory using package metadata as the SPDX-oriented source field. The CSV
  also records the license evidence source and any manual review note.

The 2026-10-14 inventory contains 2,734 unique package versions and 2,734
license rows. The generator reported 44 optional platform locators that were
not materialized on the current host and excluded them from this installed
inventory.

Generate both artifacts locally when preparing a release or reviewing dependency
changes. The generator enumerates non-workspace Yarn PnP locators, fails on
unreadable `package.json` metadata, and checks that the CycloneDX component and
license-row counts match. Platform-specific optional packages that are present
in the lockfile but are not materialized for the current Docker architecture
are reported and excluded from that platform's installed inventory. Missing
license metadata (`NOASSERTION`) and `UNLICENSED` packages also fail the
command; classify verified exceptions explicitly in
`compliance/license-overrides.json` so they cannot silently pass a release
review.

## License review

`compliance/license-policy.json` separates common permissive licenses that
may receive routine approval from licenses/expressions that require legal
review. The policy is deliberately conservative: GPL/LGPL/AGPL/MPL and custom
or multi-license expressions are not declared incompatible automatically;
their actual use, linking/distribution model, notices, and compatibility with
Underleaf's AGPL obligations must be reviewed.

Vendored libraries, fonts, dictionaries, patches, and other imported assets
must retain their original license/copyright files even when package-manager
metadata exists.

## AGPL and provenance

The repository root `LICENSE` is GNU Affero General Public License v3.0.
Underleaf is a modified descendant of Overleaf Community Edition; provenance
is recorded in `docs/ORIGIN.md` and must not be erased by branding work.

For any public network deployment of the modified AGPL-covered application,
operators must provide remote users an effective way to obtain the
Corresponding Source for the deployed revision, including Underleaf
modifications and the build/install material required by the AGPL. The source
link should identify the exact revision actually deployed.

This document is operational guidance, not legal advice.

## Review scope

The review covers npm packages, Yarn patches, vendored libraries, fonts,
dictionaries, generated assets and retained notices. Keep `LICENSE`,
`docs/ORIGIN.md`, package-level license files and `THIRD_PARTY_NOTICES.md` with
the deployed source. The AGPL obligation applies to the modified application;
it does not permit deleting upstream copyright or license notices.
