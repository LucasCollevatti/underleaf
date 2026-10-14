# Underleaf web service

The `@overleaf/web` workspace contains the HTTP application, browser bundles,
project management, authentication and editor integration used by Underleaf.
It is an internal workspace of the repository; the supported deployment is the
root Compose stack, not a separately published web service.

## Running the application

From the repository root, create a local `.env` from `.env.example`, install
the immutable Yarn dependencies and start the development stack:

```sh
corepack yarn install --immutable
make dev
```

The app is available at `http://localhost:8080` unless
`UNDERLEAF_HTTP_PORT` changes the port. `make down` stops the containers
while preserving named volumes.

For direct workspace development, the app entry point is:

```sh
corepack yarn workspace @overleaf/web run start
```

It requires the configured MongoDB, Redis and compiler services.

## Checks

Useful workspace checks are:

```sh
corepack yarn workspace @overleaf/web run test:unit
corepack yarn workspace @overleaf/web run test:frontend
corepack yarn workspace @overleaf/web run type-check
corepack yarn workspace @overleaf/web run webpack:production
```

`type-check` is the reproducible Underleaf gate and includes the maintained
Underleaf source, shared code it exercises, and Underleaf frontend tests. The
broader upstream tree is available for diagnostics with
`corepack yarn workspace @overleaf/web run type-check:legacy`; it references
optional SaaS modules that are intentionally not part of this distribution.

The product browser suite runs against a disposable Underleaf installation:

```sh
UNDERLEAF_E2E_ALLOW_BOOTSTRAP=1 \
  corepack yarn workspace @overleaf/web run test:product:e2e
```

Do not use this suite against an installation containing real data.

The development bundle uses `webpack.config.js`; the production bundle uses
`webpack.config.prod.js`. Runtime configuration comes from
`config/settings.defaults.js` and the Compose environment.

## License

This service is distributed under the AGPLv3 license. See the repository
`LICENSE` and `THIRD_PARTY_NOTICES.md` files for licensing and provenance.
