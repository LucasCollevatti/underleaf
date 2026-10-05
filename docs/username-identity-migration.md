# Username identity migration

Underleaf authenticates with a unique, lowercase username (3–32 ASCII letters,
digits, dots, underscores or dashes, beginning and ending with a letter or digit).
`displayName` is presentation; `passwordHash` is the only stored password hash.
Email is not an account field and SMTP is not required for account management.
An administrator resets a forgotten password through **Administration → Users**.
The CLI remains an administrator recovery/automation fallback.

If no administrator can log in, an operator with container access can run
`underleaf reset-password` in the web container. The CLI prompts for username,
password and confirmation; `--activate` explicitly enables a disabled account.
It replaces the password locally and invalidates previous sessions, without
changing the account role. Never put passwords in command-line arguments.

## Upgrade existing installations

1. Stop application containers, including web and real-time, before upgrading.
   Keep MongoDB running. Do not run old and new application images concurrently.
2. Take a complete `mongodump` of the installation database, including migration
   history and indexes. Store the backup and the previous image tag securely.
   Verify the dump can be restored into a disposable database before upgrading.
3. Start the new image. The existing init migration runner executes
   `20261002100000_underleaf_username_accounts` (when not already applied), then
   `20261005100000_underleaf_username_identity`, before starting web. Both use
   the same normalized reservation planner, so a legacy `Alpha` reserves `alpha`
   before a missing username derived from an `alpha@...` address is assigned. A failed
   migration prevents startup. It is safe to rerun after correcting its cause.
4. Inspect `users`: every document must have a unique normalized `username`,
   `displayName`, `role` (`admin`/`user`), `status` (`active`/`disabled`) and no
   `email`, `emails`, `hashedPassword` or plaintext `password`. Verify the
   `username_1` unique index is non-sparse and email indexes are absent.
5. Log in with an existing account and verify project ownership, collaboration,
   chat and history. Existing sessions must log in again. Test creating another
   user and resetting its password from Administration.

Valid existing usernames are preserved after trimming and lowercasing. Duplicate
normalized usernames stop preflight before any write; resolve those names in the
stopped database and restart. Missing/invalid usernames are assigned from the
former email local part, or `user-<ObjectId>` when unusable. Numeric suffixes
resolve collisions deterministically, reserving all valid existing usernames
first. Inspect assigned usernames before handing credentials to users.

User IDs and all project/member/history references stay unchanged. Existing
password hashes are copied unchanged from `hashedPassword` when necessary;
accounts without a local password are disabled until an administrator sets one
and explicitly enables them. Display names use the existing display name, full
name or username. Role and status preserve administrator/disabled access.

The migration removes email fields, related indexes and old email/password
tokens, and redacts deleted-account email/password snapshots. It performs
preflight before writes and can resume after an interruption. There is no
lossless down migration once email fields have been removed.

## Rollback

Stop the upgraded application, restore the **entire** pre-upgrade database
(including indexes and migration history), then start the matching previous
application image. Clear application sessions during rollback. Do not merely
delete the migration marker or recreate email indexes: removed values cannot be
reconstructed. New accounts and project changes made after the backup require
separate recovery; schedule an upgrade maintenance window accordingly.
