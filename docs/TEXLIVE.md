# Why Underleaf uses full TeX Live

Underleaf uses the **full TeX Live distribution supplied by its configured source image** inside a dedicated `compiler` container, separate from the web application. This prioritizes compatibility with real LaTeX documents without manually installing package collections on the host.

## Benefits and trade-offs

Documents depend on different classes, styles, fonts, bibliographies, and languages. Minimal installations may fail with errors such as `File ... .sty not found`. Full TeX Live reduces that risk and provides pdfLaTeX, XeLaTeX, LuaLaTeX, latexmk, BibTeX, and Biber.

The trade-off is **a larger first download**, greater disk consumption, and a heavier initial build. Even a full TeX Live distribution **does not guarantee** that every external executable or operating-system font required by a special project is present.

## How it works in Docker

The [compiler Dockerfile](../server-ce/Dockerfile-compiler) uses a multi-stage build:

1. Selects `UNDERLEAF_TEXLIVE_IMAGE` (default: `texlive/texlive:latest`).
2. Copies `/usr/local/texlive` from that image into the compiler image.
3. Installs CLSI's production dependencies and configures its runtime.
4. Checks for `pdflatex`, `xelatex`, `lualatex`, `latexmk`, `bibtex`, `biber`, `makeindex`, and representative TeX files.
5. Runs CLSI as an unprivileged user with the limits defined in [Compose](../compose.yaml).

There is no local `tlmgr` allowlist that selects an arbitrary subset of packages. The Dockerfile also **does not copy the entire source image's operating system**, only the specified TeX Live directory. Handle external executable dependencies separately.

**Do not install TeX Live on your computer just to run Underleaf.** The standard `up` command builds the required images:

```bash
bash ./scripts/underleaf.sh up
```

On Windows PowerShell:

```powershell
.\scripts\underleaf.ps1 up
```

## Rebuilding or updating the compiler

To rebuild only the compiler image:

| Linux | Windows (PowerShell) |
| --- | --- |
| `bash ./scripts/underleaf.sh build-compiler` | `.\scripts\underleaf.ps1 build-compiler` |

After building, start/update the containers using `up`. The current `up` implementation uses `--build` and may therefore recheck other image build stages. To rebuild **only the web application** without reinstalling TeX Live, see `make web` in [DEPLOYMENT.md](DEPLOYMENT.md).

The running compiler does not automatically install TeX packages after its image is built. To change the distribution, select a reviewed source image, rebuild, and test affected documents.

## Versioning and reproducibility

The [`.env.example`](../.env.example) contains:

```dotenv
UNDERLEAF_TEXLIVE_IMAGE=texlive/texlive:latest
```

The `latest` tag is resolved at build time; it **does not necessarily identify the newest TeX Live installed in the currently running container**, nor does it update a running container automatically.

For reproducible deployments, set `UNDERLEAF_TEXLIVE_IMAGE` in `.env` to a verified immutable image reference (for example, a vendor-published `sha256` digest) and record the corresponding Underleaf Git revision. The administration page displays the TeX Live version detected at runtime.

Check engines in the running container:

```bash
docker compose --env-file .env exec compiler pdflatex --version
docker compose --env-file .env exec compiler xelatex --version
docker compose --env-file .env exec compiler lualatex --version
```

Check whether a `.sty` file exists:

```bash
docker compose --env-file .env exec compiler kpsewhich tcolorbox.sty
```

These checks do not change the deployment.

## Resources and isolation

| `.env` variable | Default | Purpose |
| --- | --- | --- |
| `UNDERLEAF_TEXLIVE_IMAGE` | `texlive/texlive:latest` | TeX Live source image |
| `UNDERLEAF_COMPILE_CPUS` | `4` | Compiler CPU limit |
| `UNDERLEAF_COMPILE_MEMORY` | `8G` | Container memory limit |
| `UNDERLEAF_COMPILE_TIMEOUT` | `3600` | Compilation timeout in seconds |
| `UNDERLEAF_MAX_PROJECT_SIZE` | `0` | No product-level cap; infrastructure limits still apply |

An 8 GB memory limit **does not reserve** 8 GB at all times. Monitor real usage before sizing for large or concurrent compilations. The 30 GB free disk recommendation is a starting point, not a guarantee for all caches, images, projects, and backups.

For security, `compiler` publishes no host ports, uses a read-only root filesystem, drops capabilities, and receives neither the `app` secrets nor the Docker socket. It does not join the MongoDB/Redis network.

## Diagnostics

If a PDF fails to compile, first inspect the document's LaTeX errors in the editor. Then:

```bash
docker compose --env-file .env ps compiler
docker compose --env-file .env logs --tail=200 compiler
docker compose --env-file .env exec compiler kpsewhich brazilian.ldf
```

A missing LaTeX package, unavailable external tool, document syntax error, out-of-memory condition, and timeout require different remedies. See [Troubleshooting](TROUBLESHOOTING.md) before modifying the compiler or deleting any volume.
