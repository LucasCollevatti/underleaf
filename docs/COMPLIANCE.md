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

The same command validates `compliance/license-review.json`: every reviewed
package/version must exist in the installed inventory with the same declared
license and an `approved` status, and every package-backed distributed
component must resolve to the same inventory record.

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

## Completed package review

The six direct package records highlighted by the current inventory were
reviewed on 2026-10-14 and are recorded in
`compliance/license-review.json`. The review distinguishes server runtime,
browser bundle, browser assets and test-only dependencies. `MIT-0` is treated
as an automatically approved permissive license by
`compliance/license-policy.json`; the remaining highlighted direct records are
explicitly reviewed rather than silently ignored.

| Package                  | Version  | License               | Distribution decision                                                                             |
| ------------------------ | -------- | --------------------- | ------------------------------------------------------------------------------------------------- |
| `@overleaf/dictionaries` | `0.0.3`  | AGPL-3.0-only         | Approved for copied browser dictionary assets; preserve the AGPL notice and Corresponding Source. |
| `@overleaf/logger`       | `3.1.1`  | AGPL-3.0-only         | Approved as part of the AGPL-covered server source; retain `libraries/logger/LICENSE.txt`.        |
| `chai-as-promised`       | `7.1.2`  | WTFPL                 | Approved as test-only; excluded from the production dependency focus.                             |
| `dompurify`              | `3.4.12` | MPL-2.0 OR Apache-2.0 | Approved using the Apache-2.0 option in the browser bundle; retain the upstream notice.           |
| `pyodide`                | `0.29.3` | MPL-2.0               | Approved for copied browser runtime assets; retain the MPL notice and source reference.           |
| `sinon-chai`             | `3.7.0`  | BSD-2-Clause OR WTFPL | Approved as test-only; excluded from the production dependency focus.                             |

The production web build also distributes MathJax 4.1.2 (Apache-2.0), PDF.js
5.1.91 (Apache-2.0), highlight.js 11.11.1 (BSD-3-Clause), OFL-1.1 web fonts,
Apache-2.0 Material Symbols, and the retained per-theme notices for the
CodeMirror/Ace editor themes. Webpack's copy rules and the evidence for each
component are listed in `compliance/license-review.json`. The package archives
remain in the Yarn PnP cache used by the image build, while source-side license
and attribution files remain in the repository.

## Review scope

The review covers npm packages, Yarn patches, vendored libraries, fonts,
dictionaries, generated assets and retained notices. Keep `LICENSE`,
`docs/ORIGIN.md`, package-level license files and `THIRD_PARTY_NOTICES.md` with
the deployed source. The AGPL obligation applies to the modified application;
it does not permit deleting upstream copyright or license notices.
