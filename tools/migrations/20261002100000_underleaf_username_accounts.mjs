const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/

function normalizeUsername(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 32)
}

function fallbackUsername(user) {
  const email = user.email || user.emails?.[0]?.email
  const localPart = email?.split('@')[0]
  const candidate = normalizeUsername(localPart || `user-${user._id}`)
  return USERNAME_PATTERN.test(candidate) ? candidate : `user-${user._id}`
}

async function uniqueUsername(users, user) {
  const base = fallbackUsername(user).slice(0, 27) || 'user'
  let username = base
  let suffix = 1
  while (users.has(username)) {
    username = `${base}-${suffix}`.slice(0, 32)
    suffix += 1
  }
  users.add(username)
  return username
}

const migrate = async client => {
  const { db } = client
  const usersCollection = db.users
  const existingUsers = await usersCollection
    .find(
      { username: { $type: 'string', $ne: '' } },
      { projection: { username: 1 } }
    )
    .toArray()
  const existingUsernames = new Set(
    existingUsers.map(user => user.username)
  )
  const cursor = usersCollection.find({
    $or: [{ username: { $exists: false } }, { username: null }, { username: '' }],
  })

  for await (const user of cursor) {
    const username = await uniqueUsername(existingUsernames, user)
    const now = new Date()
    await usersCollection.updateOne(
      { _id: user._id },
      {
        $set: {
          username,
          passwordHash: user.passwordHash || user.hashedPassword,
          displayName:
            user.displayName || user.first_name || username,
          role: user.isAdmin ? 'admin' : user.role || 'user',
          status: user.suspended ? 'disabled' : 'active',
          createdAt: user.createdAt || user.signUpDate || now,
          updatedAt: now,
          lastLoginAt: user.lastLoginAt || user.lastLoggedIn,
        },
      }
    )
  }

  await usersCollection.createIndex(
    { username: 1 },
    { unique: true, sparse: true, name: 'username_1' }
  )
}

const rollback = async client => {
  await client.db.users.dropIndex('username_1')
}

export default {
  tags: ['server-ce'],
  migrate,
  rollback,
}
