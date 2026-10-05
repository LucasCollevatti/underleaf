const USERNAME_PATTERN = /^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/
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
