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
  inventory using package metadata as the SPDX-oriented source field.

CI generates and uploads both artifacts on every relevant push and pull
request. Missing license metadata (`NOASSERTION`) and `UNLICENSED` packages
cause the generator to fail so they cannot silently pass a public-release
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
