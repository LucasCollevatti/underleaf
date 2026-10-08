# Secret hygiene

Underleaf is intended to be safe to publish as a public repository. Secret
handling therefore covers both the current tree and reachable Git history.

## Local gate

Secret scanning is a manual local/release gate. The repository does not use a
GitHub Actions workflow for this check. With Gitleaks installed, scan the full
reachable history before publication:

```sh
gitleaks git --redact --verbose --log-opts="--all"
```

`.gitleaks.toml` extends the default rules. Allowlists must identify a proven
false positive narrowly; broad path, extension, entropy or credential-pattern
exclusions are forbidden.

## Repository rules

- Keep `.env` and local override files ignored; only empty/example values may
  be committed.
- Use unmistakably synthetic fixtures such as `example.invalid`,
  `test-user` or empty secret fields.
- Never commit production-looking API keys, JWTs, private keys, cloud access
  keys or realistic passwords for convenience.
- Do not include secrets, session cookies, hashes or document contents in
  issues, logs or test artifacts.

## If a real secret is found

1. Treat the value as compromised and rotate or revoke it immediately.
2. Identify every occurrence in reachable refs and tags.
3. Rewrite history with an appropriate tool such as `git filter-repo`.
4. Force-update only the intended rewritten refs after coordinating with
   collaborators.
5. Re-run the full-history Gitleaks scan and verify that the revoked credential
   can no longer authenticate.

Deleting a secret from the working tree is not remediation if the value remains
in Git history.

The empty assignments in `.env.example` intentionally document the
`UNDERLEAF_SESSION_SECRET` value that an operator must generate locally.
