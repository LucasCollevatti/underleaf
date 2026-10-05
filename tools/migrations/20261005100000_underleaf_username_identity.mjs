const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/
const REMOVED_FIELDS = {
  email: '',
  emails: '',
  hashedPassword: '',
  password: '',
  must_reconfirm: '',
  lastPrimaryEmailCheck: '',
  onboardingEmailSentAt: '',
}

function normalize(value) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

function legacyUsername(user) {
  const localPart = (user.email || user.emails?.[0]?.email || '').split('@')[0]
  const candidate = normalize(localPart)
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 32)
    .replace(/[^a-z0-9]+$/g, '')
  return USERNAME_PATTERN.test(candidate) ? candidate : `user-${user._id}`
}

export function planIdentityMigration(users) {
  const reserved = new Set()
  // Reserve every valid existing account name before assigning missing names.
  for (const user of users) {
    const username = normalize(user.username)
    if (!USERNAME_PATTERN.test(username)) continue
    if (reserved.has(username)) {
      throw new Error(
        `Conflicting username "${username}". Resolve the duplicate before migrating.`
      )
    }
    reserved.add(username)
  }

  return [...users]
    .sort((a, b) => String(a._id).localeCompare(String(b._id)))
    .map(user => {
      let username = normalize(user.username)
      if (!USERNAME_PATTERN.test(username)) {
        const base = legacyUsername(user)
        username = base
        let suffix = 1
        while (reserved.has(username)) {
          const tail = `-${suffix++}`
          username =
            base.slice(0, 32 - tail.length).replace(/[^a-z0-9]+$/g, '') + tail
        }
        reserved.add(username)
      }
      const now = new Date()
      const passwordHash = user.passwordHash || user.hashedPassword
      const displayName =
        (
          user.displayName ||
          [user.first_name, user.last_name].filter(Boolean).join(' ') ||
          username
        )
          .trim()
          .slice(0, 255) || username
      const role = user.isAdmin || user.role === 'admin' ? 'admin' : 'user'
      const status =
        user.status === 'disabled' || user.suspended || !passwordHash
          ? 'disabled'
          : 'active'
      const fields = {
        username,
        displayName,
        role,
        isAdmin: role === 'admin',
        status,
        suspended: status === 'disabled',
        createdAt: user.createdAt || user.signUpDate || now,
        updatedAt: user.updatedAt || now,
        identityVersion: user.identityVersion || 1,
      }
      if (passwordHash) fields.passwordHash = passwordHash
      if (user.lastLoginAt || user.lastLoggedIn)
        fields.lastLoginAt = user.lastLoginAt || user.lastLoggedIn
      return { _id: user._id, fields }
    })
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
