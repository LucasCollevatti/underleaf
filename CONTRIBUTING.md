# Contributing to Underleaf

Underleaf is a self-hosted collaborative LaTeX editor for trusted local
deployments. Contributions should preserve the supported product scope and
keep the repository runnable with the canonical Compose stack.

## Issues

Before opening an issue, search existing reports and include a small,
reproducible description. Please provide:

- the steps that reproduce the problem;
- the expected and observed behavior;
- the Underleaf version or commit;
- relevant browser, operating system and Docker details;
- sanitized logs or screenshots when they help explain the failure.

Do not include passwords, session cookies, document contents or other private
data in an issue.

## Pull requests

Keep each change focused and preserve existing behavior unless the change is
intentional. Update documentation and tests when the supported behavior or
runtime changes. Do not commit secrets, local environment files, generated
build output or dependency directories.

Run the checks relevant to the change. The usual local gate is:

```sh
corepack yarn install --immutable
corepack yarn format
corepack yarn lint
corepack yarn workspace @overleaf/web type-check
docker compose -f compose.yaml --env-file .env config --quiet
```

For runtime changes, also exercise the affected Compose service and the
appropriate smoke test under `tests/`.

## Security

Do not report vulnerabilities in a public issue. Follow the instructions in
[`docs/SECURITY.md`](docs/SECURITY.md) and provide only the minimum details
needed for a private report.

Underleaf does not require a Contributor License Agreement. Contributions
remain subject to the repository license and the applicable provenance notices
in `LICENSE`, `THIRD_PARTY_NOTICES.md` and `docs/ORIGIN.md`.
