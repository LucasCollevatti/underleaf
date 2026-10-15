# Current architecture

## Executable topology

```text
compose.yaml
├── app       web application and internal services, without LaTeX execution
├── compiler  CLSI and TeX toolchain in a dedicated sandbox
├── mongo     MongoDB persistence with a replica set
└── redis     queues, sessions, and real-time collaboration
```

The `app` container still uses the imported runtime under `server-ce/`, application workspaces under `services/`, and shared libraries under `libraries/`. These paths remain intact because Yarn PnP, the Webpack build, startup scripts, and several services depend on them.

## Compiler boundary

Compilation requests go through `services/web/app/src/Features/Compile/UnderleafCompilerGateway.mjs`. This internal gateway accepts structured compilation requests and returns CLSI results, including status, build information, logs, errors, and artifacts. `compose.yaml` does not publish a compiler port on the host.

CLSI runs exclusively in `compiler`. The `app` no longer starts the `clsi-overleaf` runit service. Requests travel over the internal `compiler_net` network. From there, the compiler can reach only the app's filestore; it has no access to MongoDB or Redis networks. Its API has no published host port.

Generated files reside in the `underleaf_compiler_work` volume, mounted read-write by the compiler and read-only by the app. Internal nginx can therefore serve PDFs, logs, and auxiliary outputs without running TeX tools in the web container.

## Shared application shell

`services/web/frontend/js/shared/components/underleaf/` contains `UnderleafAppShell`, `UnderleafSidebar`, and `UnderleafBrand`. The shell reuses imported Overleaf dashboard styles and tokens. Its sidebar supports `authenticated`, `unauthenticated`, and `setup` variants, server-controlled administrative navigation, and mobile expansion.

New React pages should use `UnderleafAppProviders` and `UnderleafAppShell`. Pages already providing `SplitTestProvider`, `UserSettingsProvider`, and `DsNavStyleProvider` use the shell directly to avoid duplicating state. Every page provides its own `main` landmark and `#main-content` target. The `navigation`, `footer`, and `resizeHandle` slots retain the Projects filters, tags, trash, and resizing; `header` hosts the existing navbar on smaller screens.

The original `ThemeToggle` lives under `shared/components/sidebar/` and continues to use `useSetOverallTheme`, `UserSettingsProvider`, and `useThemedPage`. Backend values remain `system`, `light-`, and `''` (dark), without a second theme store. Signed-in accounts use the server setting at `/user/settings`; guests store the same preference in the browser without contacting that endpoint. Other selectors share the provider.

Public `underleaf-mark`, `underleaf-wordmark`, and `underleaf-lockup` SVGs have light and dark variants. `UnderleafBrand` tracks the active theme, including operating-system theme changes.

Projects (including the empty state), Login, Welcome, Settings, Administration, and Users use the shared shell. Empty Projects retains filters, tags, trash, and creation/import within the normal dashboard rather than displaying a marketing welcome page. Status, errors, maintenance, expired sessions, and logout confirmation use it as well. The editor retains its own layout, with Underleaf branding and a wordmark while loading.

`pages/underleaf-system` replaces the initial HTML only after translations load. Navigation, messages, and logout remain usable when JavaScript fails. Errors occurring before page metadata is available use `system-static`, without database queries while rendering the error. Internal 5xx details are not exposed. Logout remains a CSRF-protected POST; canceling does not terminate the session.

HTML-preferring `GET /status` requires an administrator and reports web-process health and site/editor access flags. It does not diagnose MongoDB, Redis, or the compiler. Public healthchecks using wildcard, JSON, or text Accept headers retain their existing responses, including HTTP 503 on shutdown. The private API `/status` remains unchanged.

An expired editor session offers login in another tab and a manual refresh. The editor tab is not automatically reloaded over unsaved changes. Underleaf navbar and footer omit plans, affiliations, marketing, and SaaS support. Provenance, copyright, and license notices remain intact. SVG favicons distinguish compiling, success, and failure in light/dark themes; the manifest opens Projects. New interface strings are available in English and Portuguese, with English fallback for other frontend languages.

## Account administration

`pages/underleaf-admin` renders `/admin` and `/admin/users`. Overview displays total accounts, active users, active administrators, and active projects. Pages hydrate the administrator's stored theme and expose only required public data; administrative responses use `Cache-Control: no-store`.

Users provides a read-only table searchable by username or display name. Creating accounts, editing identity/roles, resetting passwords, enabling/disabling accounts, and deleting users use modals. Password and state POST operations are separate from identity editing, preventing accidental overwrite of untouched fields. Routes remain admin-only and CSRF-protected, and reuse `UnderleafUserManager` for validation, password hashing, session invalidation, and protection of the last active administrator.

Deleting an account requires explicitly choosing to delete all its projects and typing `DELETE`. The initial selection preserves the account and projects, and canceling sends no request. Project counts include inactive, archived, and trashed projects owned by the account, matching the existing `UserDeleter` scope. To preserve projects, the administrator must cancel and transfer ownership through the sharing dialogs before deletion. The UI prevents disabling/deleting the current administrator or removing their own admin role; server-side checks enforce the same rules.

## Installation bootstrap

`UnderleafInstallationManager` maintains the `underleafInstallations/installation` singleton in the same MongoClient as the User model. All bootstrap writers (Welcome and CLI) increment its revision before querying users in a transaction. The driver retries conflicts; only one initial creation can commit. Names and passwords use `UnderleafUserManager` validation; credentials and persistent installation state are never committed separately. Existing installations with any account are adopted without rewriting data. Initialization remains permanent even after all accounts are removed; recovery requires server access to the CLI.

`UnderleafWelcomeRouter` is mounted after session and CSRF middleware and before the mandatory login middleware. It redirects requests from an empty installation to `/welcome`. Static assets, healthchecks, and internal APIs retain their existing routers. After the administrator commits, the controller reuses `finishLogin`, including session regeneration, auditing, and CSRF rotation. Failure at that stage does not roll back initialization and offers login through `/login`.

`pages/underleaf-auth` renders Welcome and Login with the same shell. The setup sequence proceeds from Welcome through Administrator to Ready, then opens `/project` automatically. Login uses username/password and preserves safe redirects. Guest theme preferences remain local; authenticated preferences remain server-backed.

## Local accounts and collaboration

Settings shows a read-only username, editable display name, password change, sessions, and System/Light/Dark appearance. The server supplies preferences through `UserSettingsHelper`, shared by Projects and the editor. The preferences endpoint still accepts editor options, but in Underleaf rejects institutional settings and themes outside the supported three values. Account page metadata omits email, affiliations, plans, and SSO.

The Underleaf sharing modal uses existing local accounts, without email invitations, invitation CAPTCHA, or plan limits. Authenticated `GET /underleaf/users/search?username=lu` returns up to 20 active users matching a normalized prefix, sorted by username and including only ID, username, and display name. Search and grants are rate-limited.

`PUT /project/:Project_id/users/by-username` grants or updates editor/viewer access. `DELETE /project/:Project_id/users/by-username/:username` revokes access, including for disabled accounts. Both require administrative access to the project and reuse collaboration, auditing, and WebSocket handlers. These paths cannot demote or remove the owner; ownership transfer remains an explicit separate flow. Access requests are handled within the modal without email notifications.

Legacy invitation, invitation-token acceptance, reusable group links, subscriptions, and affiliation routes are unavailable in Underleaf. Classic token-sharing links remain optional where the installation enables them; username-based grants do not depend on these links. Historical shared SaaS code and old persisted data may remain in the repository/database, and this change does not perform a destructive migration.
