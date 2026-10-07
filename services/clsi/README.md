# Underleaf compiler service

This workspace implements the internal Common LaTeX Service Interface (CLSI)
used by Underleaf to compile project documents. It is deployed as the
dedicated `compiler` service from the root `compose.yaml`.

## Supported runtime

The compiler image is built by `server-ce/Dockerfile-compiler`. It contains
the TeX Live tools required by the supported compilers and runs the CLSI on
internal port `3013`. The Compose service:

- runs as `www-data`;
- uses a read-only root filesystem and a writable compiler work volume;
- has no published host port;
- is attached only to the internal compiler network;
- does not receive application secrets or the Docker socket;
- keeps compile inputs, outputs and cache under
  `/var/lib/underleaf/compiler`.

The web app reaches the service through the internal `compiler` hostname. Do
not run the compiler as an independently exposed sibling-container service.

## Build and run

Build the shared base image and compiler image from the repository root:

```sh
make build-base
docker compose --env-file .env build compiler
docker compose --env-file .env up -d compiler
```

The health endpoint is available only inside the Compose network at
`http://compiler:3013/status`. The canonical end-to-end check is to start the
full stack with `make dev` and compile a representative project through the
Underleaf editor.

## Configuration

The Compose file supplies the paths and limits used by the current runtime:

- `CLSI_COMPILES_PATH`
- `CLSI_OUTPUT_PATH`
- `CLSI_CACHE_PATH`
- `CLSI_UPLOAD_PATH`
- `TEXMFVAR`
- `UNDERLEAF_COMPILE_TIMEOUT`
- `UNDERLEAF_MAX_PROJECT_SIZE`

The compiler API accepts a project compile request containing a root resource,
the project resources and compiler options such as `pdflatex`, `xelatex` or
`lualatex`. The web service owns authentication and file delivery; the CLSI
is not a public application API.

## Validation

Run the workspace checks from the repository root when changing this service:

```sh
corepack yarn workspace @overleaf/clsi run lint
corepack yarn workspace @overleaf/clsi run types:check
corepack yarn workspace @overleaf/clsi run test:unit
docker compose -f compose.yaml --env-file .env config --quiet
```

See `docs/SECURITY.md` and `docs/PERSISTENCE.md` for the compiler
boundary, volume ownership and backup implications.

## License

This service is distributed under the AGPLv3 license. See the repository
`LICENSE` and `THIRD_PARTY_NOTICES.md` files.
