import crypto from 'node:crypto'
import bcrypt from 'bcrypt'
import AuthenticationManager from '../Authentication/AuthenticationManager.mjs'
import UserDeleter from '../User/UserDeleter.mjs'
import { User } from '../../models/User.mjs'
import { db } from '../../infrastructure/mongodb.mjs'

const USERNAME_PATTERN = /^[a-z0-9](?:[a-z0-9._-]{1,30}[a-z0-9])?$/
const MIN_USERNAME_LENGTH = 3
const MAX_USERNAME_LENGTH = 32
const TECHNICAL_EMAIL_DOMAIN = 'underleaf.local'

export class UnderleafUserError extends Error {
  constructor(code, message) {
    super(message)
    this.name = 'UnderleafUserError'
    this.code = code
  }
}

export function normalizeUsername(username) {
  if (typeof username !== 'string') return ''
  return username.trim().toLowerCase()
}

export function validateUsername(username) {
  const normalizedUsername = normalizeUsername(username)
  if (
    normalizedUsername.length < MIN_USERNAME_LENGTH ||
    normalizedUsername.length > MAX_USERNAME_LENGTH ||
    !USERNAME_PATTERN.test(normalizedUsername)
  ) {
    throw new UnderleafUserError(
      'invalid_username',
      'Username must contain 3-32 lowercase letters, numbers, dots, dashes or underscores.'
    )
  }
  return normalizedUsername
}

function validatePassword(password) {
  if (typeof password !== 'string') {
    throw new UnderleafUserError('invalid_password', 'Password is required.')
  }
  const validationError = AuthenticationManager.validatePassword(password, '')
  if (validationError) {
    throw new UnderleafUserError(
      validationError.info?.code || 'invalid_password',
      'Password does not meet the minimum requirements.'
    )
  }
  return password
}

function technicalEmailForUsername(username) {
  return `${username}@${TECHNICAL_EMAIL_DOMAIN}`
}

async function findById(userId) {
  return await User.findById(userId).exec()
}

async function createUser(
  { username, password, displayName, role = 'user' },
  { session = null } = {}
) {
  const normalizedUsername = validateUsername(username)
  validatePassword(password)
  if (!['admin', 'user'].includes(role)) {
    throw new UnderleafUserError('invalid_role', 'Role must be admin or user.')
  }

  const existingUser = await User.findOne({ username: normalizedUsername })
    .session(session)
    .select({ _id: 1 })
    .lean()
  if (existingUser) {
    throw new UnderleafUserError(
      'username_taken',
      'Username is already in use.'
    )
  }

  const now = new Date()
  const hash = await AuthenticationManager.promises.hashPassword(password)
  const safeDisplayName = (displayName || normalizedUsername).trim()
  const technicalEmail = technicalEmailForUsername(normalizedUsername)
  const user = new User({
    username: normalizedUsername,
    passwordHash: hash,
    hashedPassword: hash,
    displayName: safeDisplayName,
    first_name: safeDisplayName,
    last_name: '',
    role,
    isAdmin: role === 'admin',
    status: 'active',
    createdAt: now,
    updatedAt: now,
    email: technicalEmail,
    emails: [
      {
        email: technicalEmail,
        createdAt: now,
        confirmedAt: now,
      },
    ],
    analyticsId: crypto.randomUUID(),
    labsProgram: false,
    holdingAccount: false,
  })
  return await user.save({ session })
}

async function authenticate(username, password) {
  const normalizedUsername = normalizeUsername(username)
  const user = await User.findOne({ username: normalizedUsername }).exec()
  if (!user) return { user: null, reason: 'invalid_credentials' }

  if (user.status === 'disabled' || user.suspended) {
    return { user: null, reason: 'disabled' }
  }

  const storedHash = user.passwordHash || user.hashedPassword
  const passwordMatches = storedHash
    ? await bcrypt.compare(password || '', storedHash)
    : false

  if (!passwordMatches) {
    await User.updateOne(
      { _id: user._id },
      { $set: { lastFailedLogin: new Date(), updatedAt: new Date() } }
    ).exec()
    return { user: null, reason: 'invalid_credentials' }
  }

  const now = new Date()
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        lastLoginAt: now,
        lastLoggedIn: now,
        updatedAt: now,
      },
      $inc: { loginCount: 1 },
    }
  ).exec()
  user.lastLoginAt = now
  user.lastLoggedIn = now
  return { user, reason: null }
}

async function updateUser(userId, changes) {
  const user = await findById(userId)
  if (!user) throw new UnderleafUserError('not_found', 'User not found.')

  await ensureActiveAdminRemains(user, changes)

  const update = { $set: { updatedAt: new Date() } }
  if (changes.username != null) {
    const username = validateUsername(changes.username)
    const duplicate = await User.findOne({
      username,
      _id: { $ne: user._id },
    })
      .select({ _id: 1 })
      .lean()
    if (duplicate) {
      throw new UnderleafUserError(
        'username_taken',
        'Username is already in use.'
      )
    }
    update.$set.username = username
    update.$set.email = technicalEmailForUsername(username)
    update.$set.emails = [
      {
        email: technicalEmailForUsername(username),
        createdAt: user.createdAt || new Date(),
        confirmedAt: new Date(),
      },
    ]
  }
  if (changes.displayName != null) {
    const displayName = changes.displayName.trim()
    if (!displayName) {
      throw new UnderleafUserError(
        'invalid_display_name',
        'Display name cannot be empty.'
      )
    }
    update.$set.displayName = displayName
    update.$set.first_name = displayName
  }
  if (changes.role != null) {
    if (!['admin', 'user'].includes(changes.role)) {
      throw new UnderleafUserError(
        'invalid_role',
        'Role must be admin or user.'
      )
    }
    update.$set.role = changes.role
    update.$set.isAdmin = changes.role === 'admin'
  }
  if (changes.status != null) {
    if (!['active', 'disabled'].includes(changes.status)) {
      throw new UnderleafUserError(
        'invalid_status',
        'Status must be active or disabled.'
      )
    }
    update.$set.status = changes.status
    update.$set.suspended = changes.status === 'disabled'
  }
  if (changes.password != null) {
    validatePassword(changes.password)
    const hash = await AuthenticationManager.promises.hashPassword(
      changes.password
    )
    update.$set.passwordHash = hash
    update.$set.hashedPassword = hash
  }

  await User.updateOne({ _id: user._id }, update).exec()
  return await findById(user._id)
}

async function listUsers() {
  return await User.aggregate([
    {
      $lookup: {
        from: 'projects',
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ['$owner_ref', '$$userId'] },
                  { $eq: ['$active', true] },
                ],
              },
            },
          },
          { $count: 'count' },
        ],
        as: 'ownedProjects',
      },
    },
    {
      $set: {
        projectCount: {
          $ifNull: [{ $arrayElemAt: ['$ownedProjects.count', 0] }, 0],
        },
      },
    },
    {
      $project: {
        _id: 1,
        username: 1,
        displayName: 1,
        role: 1,
        isAdmin: 1,
        status: 1,
        createdAt: 1,
        updatedAt: 1,
        lastLoginAt: 1,
        projectCount: 1,
      },
    },
    { $sort: { username: 1, _id: 1 } },
  ]).exec()
}

async function countOwnedProjects(userId) {
  return await db.projects.countDocuments({ owner_ref: userId, active: true })
}

function isActiveAdmin(user) {
  return user.status !== 'disabled' && (user.role === 'admin' || user.isAdmin)
}

async function countActiveAdmins() {
  return await User.countDocuments({
    status: { $ne: 'disabled' },
    $or: [{ role: 'admin' }, { isAdmin: true }],
  }).exec()
}

async function ensureActiveAdminRemains(user, changes) {
  if (!isActiveAdmin(user)) return

  const willLoseAdminAccess =
    changes.role === 'user' || changes.status === 'disabled'
  if (!willLoseAdminAccess) return

  if ((await countActiveAdmins()) <= 1) {
    throw new UnderleafUserError(
      'last_admin',
      'The last active administrator cannot be disabled or demoted.'
    )
  }
}

async function deleteUser(userId, { deleterUser, ipAddress, deleteProjects }) {
  const user = await findById(userId)
  if (!user) throw new UnderleafUserError('not_found', 'User not found.')
  await ensureActiveAdminRemains(user, { status: 'disabled' })
  const projectCount = await countOwnedProjects(user._id)
  if (projectCount > 0 && !deleteProjects) {
    throw new UnderleafUserError(
      'projects_owned',
      'User owns projects. Choose an explicit project deletion action.'
    )
  }
  await UserDeleter.promises.deleteUser(user._id, {
    deleterUser: deleterUser || user,
    ipAddress: ipAddress || '127.0.0.1',
  })
}

export default {
  createUser,
  authenticate,
  updateUser,
  listUsers,
  countOwnedProjects,
  deleteUser,
  normalizeUsername,
  validateUsername,
  validatePassword,
}
