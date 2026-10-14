# Third-party notices

Underleaf includes and depends on software, fonts, dictionaries, assets and
other material distributed by third parties.

The root `LICENSE` is GNU Affero General Public License v3.0. Underleaf is a
modified descendant of Overleaf Community Edition; origin and retained
attribution are documented in `docs/ORIGIN.md`.

## Machine-readable inventory

`THIRD_PARTY_NOTICES.md` is not the dependency inventory. The authoritative
build-time inventory is generated from the installed dependency graph:

- `artifacts/sbom.cdx.json` — CycloneDX 1.6 SBOM;
- `artifacts/third-party-licenses.csv` — package, version, license/SPDX field
  and repository information.

Generate them locally with `yarn node scripts/compliance/generate-sbom.mjs` after
an immutable install and review the resulting artifacts before release.

## Preservation requirements

When adding, updating, vendoring or removing third-party material:

- preserve package-level and vendored `LICENSE`, `COPYING`, copyright and
  notice files;
- preserve license notices for fonts, dictionaries and other non-code assets;
- keep required attribution with the redistributed material;
- do not treat a package-manager license string as permission to delete an
  upstream license file;
- investigate `NOASSERTION`, `UNLICENSED`, custom and ambiguous
  multi-license expressions before a public release;
- record any approved exception with the exact package/version, license,
  rationale and reviewer.

## Corresponding Source

Public deployments must make the Corresponding Source for the deployed
AGPL-covered revision available to remote users in the manner required by
AGPLv3 section 13. That source must include Underleaf modifications and the
scripts/configuration needed to build and install that revision.

See `docs/COMPLIANCE.md` for the generation and review procedure.

## Reviewed distributed components

The current release review covers the six highlighted direct package records
and the static assets copied by the web build. The authoritative decisions,
versions, evidence paths and output locations are in
`compliance/license-review.json`.

- `@overleaf/dictionaries` 0.0.3 — AGPL-3.0-only, copied to the browser
  dictionary assets;
- `pyodide` 0.29.3 — MPL-2.0, copied to the browser runtime assets;
- `dompurify` 3.4.12 — Apache-2.0 option selected from its dual license and
  included in the browser bundle;
- MathJax 4.1.2 — Apache-2.0; PDF.js 5.1.91 — Apache-2.0; and highlight.js
  11.11.1 — BSD-3-Clause, copied or bundled by the web build;
- web fonts retain their OFL-1.1 or Apache-2.0 files, and every CodeMirror/Ace
  theme retains its per-theme `*-license.txt` attribution;
- `chai-as-promised` and `sinon-chai` are test-only dependencies and are not
  part of the production dependency focus.
