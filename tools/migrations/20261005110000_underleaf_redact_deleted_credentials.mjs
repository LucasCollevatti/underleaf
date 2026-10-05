// Existing installations may have created snapshots after the identity migration.
// Redact those as well as protecting new snapshots in UserDeleter.
async function migrate({ db }) {
  await db.deletedUsers.updateMany(
    {},
    {
      $unset: {
        'user.email': '',
        'user.emails': '',
        'user.password': '',
        'user.hashedPassword': '',
        'user.passwordHash': '',
      },
    }
  )
}

async function rollback() {
  throw new Error(
    'Credential redaction is irreversible. Restore the pre-upgrade MongoDB backup and matching application image; see docs/username-identity-migration.md.'
  )
}

export default { tags: ['server-ce'], migrate, rollback }
