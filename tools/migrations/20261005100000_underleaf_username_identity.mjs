import { planIdentityMigration } from './lib/underleaf-username-identity.mjs'
export { planIdentityMigration } from './lib/underleaf-username-identity.mjs'

const REMOVED_FIELDS = {
  email: '',
  emails: '',
  hashedPassword: '',
  password: '',
  must_reconfirm: '',
  lastPrimaryEmailCheck: '',
  onboardingEmailSentAt: '',
}

async function dropEmailIndexes(collection) {
  let indexes
  try {
    indexes = await collection.indexes()
  } catch (error) {
    if (error.code === 26) return // an empty installation has no collection yet
    throw error
  }
  for (const index of indexes) {
    if (
      Object.keys(index.key).some(
        key =>
          key === 'email' ||
          key === 'emails' ||
          key.startsWith('emails.') ||
          key === 'user.email' ||
          key.startsWith('user.emails')
      )
    ) {
      await collection.dropIndex(index.name)
    }
  }
}

async function migrate({ db }) {
  // The init runner executes before web starts. Preflight must finish before writes.
  const users = await db.users.find({}).toArray()
  const plan = planIdentityMigration(users)
  await dropEmailIndexes(db.users)
  const indexes = await db.users.indexes().catch(error => {
    if (error.code === 26) return []
    throw error
  })
  const usernameIndex = indexes.find(index => index.name === 'username_1')
  if (usernameIndex) await db.users.dropIndex(usernameIndex.name)

  for (const { _id, fields } of plan) {
    await db.users.updateOne({ _id }, { $set: fields, $unset: REMOVED_FIELDS })
  }
  await db.users.createIndex(
    { username: 1 },
    { name: 'username_1', unique: true }
  )

  // Deleted-user snapshots must not retain synthetic identities either.
  await dropEmailIndexes(db.deletedUsers)
  await db.deletedUsers.updateMany(
    {},
    {
      $unset: {
        'user.email': '',
        'user.emails': '',
        'user.hashedPassword': '',
        'user.passwordHash': '',
      },
    }
  )
  // Old confirmation/recovery tokens cannot be used after this migration.
  await db.tokens.deleteMany({
    $or: [
      {
        use: {
          $in: [
            'password',
            'email',
            'email-confirmation',
            'email_confirmation',
          ],
        },
      },
      { email: { $exists: true } },
      { 'data.email': { $exists: true } },
    ],
  })
}

async function rollback() {
  throw new Error(
    'Username identity migration removes email data. Restore the pre-upgrade MongoDB backup and matching application image; see docs/username-identity-migration.md.'
  )
}

export default { tags: ['server-ce'], migrate, rollback }
