# Secret hygiene

Underleaf is intended to be safe to publish as a public repository. Secret
handling therefore covers both the current tree and Git history.

## Required checks

- `.env` and local override files stay ignored; only empty/example values may
  be committed.
- `.github/workflows/secret-hygiene.yml` checks out the repository with
  `fetch-depth: 0` and runs Gitleaks against the complete reachable history.
- `.gitleaks.toml` extends the default rules. Allowlists must identify a
  proven false positive narrowly; broad path, extension, entropy, or
  credential-pattern exclusions are forbidden.
- Fixtures should use unmistakably synthetic values such as
  `example.invalid`, `test-user`, or empty secret fields. Do not use
  production-looking API keys, JWTs, private keys, cloud access keys, or
  realistic passwords merely for convenience.

## If a real secret is found

1. Treat the value as compromised and rotate/revoke it before any repository
   publication.
2. Identify every occurrence in reachable refs and tags.
3. Rewrite history with an appropriate tool such as `git filter-repo`.
4. Force-update only the intended rewritten refs after coordinating with all
   collaborators.
5. Re-run the full-history Gitleaks scan and verify the revoked credential can
   no longer authenticate.

Deleting a secret from HEAD is not remediation if the value remains in Git
history.

## Current examples

`.env.example` intentionally leaves `UNDERLEAF_INVITE_TOKEN_SECRET` and
`UNDERLEAF_SESSION_SECRET` empty and instructs operators to generate local
values. Those empty assignments are the only project-specific allowlisted
credential-shaped lines.
