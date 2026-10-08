import { expressify } from '@overleaf/promise-utils'
import SessionManager from '../Authentication/SessionManager.mjs'
import UserGetter from '../User/UserGetter.mjs'
import UserSettingsHelper from '../Project/UserSettingsHelper.mjs'
import UnderleafUserManager, {
  UnderleafUserError,
} from './UnderleafUserManager.mjs'
import { getUnderleafRuntimeInfo } from './UnderleafRuntimeInfo.mjs'
import { db } from '../../infrastructure/mongodb.mjs'
import { parseReq, z, zz } from '../../infrastructure/Validation.mjs'

const userParams = z.object({ userId: zz.objectId() })
const createUserSchema = z.object({
  body: z.strictObject({
    username: z.string(),
    displayName: z.string().optional(),
    password: z.string(),
    confirmPassword: z.string(),
    role: z.enum(['admin', 'user']),
  }),
})
const updateUserSchema = z.object({
  params: userParams,
  body: z.strictObject({
    username: z.string(),
    displayName: z.string(),
    role: z.enum(['admin', 'user']),
  }),
})
const resetPasswordSchema = z.object({
  params: userParams,
  body: z.strictObject({ password: z.string(), confirmPassword: z.string() }),
})
const setStatusSchema = z.object({
  params: userParams,
  body: z.strictObject({ status: z.enum(['active', 'disabled']) }),
})
const deleteUserSchema = z.object({
  params: userParams,
  body: z.strictObject({
    confirm: z.literal('DELETE'),
    projectAction: z.enum(['cancel', 'delete']),
  }),
})

function getSessionUserId(req) {
  return SessionManager.getLoggedInUserId(req.session)?.toString()
}

// Keep hashes, sessions and internal identity fields out of page/API data.
function publicUser(user, projectCount = user.projectCount) {
  return {
    id: user._id.toString(),
    username: user.username,
    displayName: user.displayName || user.username,
    role: user.role,
    status: user.status,
    projectCount,
    createdAt: user.createdAt || null,
    lastLoginAt: user.lastLoginAt || null,
  }
}

async function renderPage(req, res, view, data) {
  const user = await UserGetter.promises.getUser(getSessionUserId(req))
  const userSettings = await UserSettingsHelper.buildUserSettings(req, res, {
    ...user,
    ace: user?.ace || {},
  })
  res.set('Cache-Control', 'no-store')
  res.render(view, {
    title:
      data.page === 'users' ? 'underleaf_users' : 'underleaf_administration',
    adminPage: data,
    userSettings,
    initialTheme: UserSettingsHelper.getInitialTheme(userSettings.overallTheme),
  })
}

function respond(req, res, message, data = {}, status = 200) {
  res.set('Cache-Control', 'no-store')
  if (req.is('application/json'))
    return res.status(status).json({ ...data, message })
  res.redirect(`/admin/users?notice=${encodeURIComponent(message)}`)
}

function handleUserError(req, res, error) {
  if (!(error instanceof UnderleafUserError)) return false
  res.set('Cache-Control', 'no-store')
  if (req.is('application/json')) {
    const status =
      error.code === 'not_found'
        ? 404
        : [
              'username_taken',
              'concurrent_update',
              'last_admin',
              'own_admin',
              'own_account',
              'deletion_pending',
            ].includes(error.code)
          ? 409
          : 400
    res.status(status).json({ code: error.code, message: error.message })
  } else {
    res.redirect(`/admin/users?error=${encodeURIComponent(error.message)}`)
  }
  return true
}

async function userMutation(
  req,
  res,
  schema,
  operation,
  message,
  status = 200
) {
  const { params, body } = parseReq(req, schema)
  try {
    const user = await operation(params, body)
    const projectCount = await UnderleafUserManager.countOwnedProjects(user._id)
    respond(req, res, message, { user: publicUser(user, projectCount) }, status)
  } catch (error) {
    if (!handleUserError(req, res, error)) throw error
  }
}

function requireMatchingPasswords(body) {
  if (body.password !== body.confirmPassword) {
    throw new UnderleafUserError(
      'password_mismatch',
      'The passwords do not match.'
    )
  }
}

const UnderleafAdminController = {
  index: expressify(async (req, res) => {
    const [[userCount, activeUsers, adminUsers, projectCount], runtime] =
      await Promise.all([
        Promise.all([
          db.users.countDocuments({}),
          db.users.countDocuments({
            status: 'active',
            suspended: { $ne: true },
          }),
          db.users.countDocuments({
            role: 'admin',
            status: 'active',
            suspended: { $ne: true },
          }),
          db.projects.countDocuments({ active: true }),
        ]),
        getUnderleafRuntimeInfo(),
      ])
    await renderPage(req, res, 'underleaf/admin', {
      page: 'overview',
      stats: { userCount, activeUsers, adminUsers, projectCount },
      runtime,
    })
  }),

  users: expressify(async (req, res) => {
    const users = await UnderleafUserManager.listUsers()
    await renderPage(req, res, 'underleaf/admin-users', {
      page: 'users',
      users: users.map(user => publicUser(user)),
      currentUserId: getSessionUserId(req),
      notice: typeof req.query.notice === 'string' ? req.query.notice : '',
      error: typeof req.query.error === 'string' ? req.query.error : '',
    })
  }),

  createUser: expressify(async (req, res) => {
    await userMutation(
      req,
      res,
      createUserSchema,
      async (_params, body) => {
        requireMatchingPasswords(body)
        return await UnderleafUserManager.createUser({
          username: body.username,
          displayName: body.displayName,
          password: body.password,
          role: body.role,
        })
      },
      'User created.',
      201
    )
  }),

  updateUser: expressify(async (req, res) => {
    await userMutation(
      req,
      res,
      updateUserSchema,
      async (params, body) => {
        if (
          getSessionUserId(req) === params.userId.toString() &&
          body.role !== 'admin'
        ) {
          throw new UnderleafUserError(
            'own_admin',
            'You cannot remove your own administrator access.'
          )
        }
        return await UnderleafUserManager.updateUser(params.userId, body)
      },
      'User updated.'
    )
  }),

  resetPassword: expressify(async (req, res) => {
    await userMutation(
      req,
      res,
      resetPasswordSchema,
      async (params, body) => {
        requireMatchingPasswords(body)
        return await UnderleafUserManager.updateUser(params.userId, {
          password: body.password,
        })
      },
      'Password reset. Existing sessions were invalidated.'
    )
  }),

  setStatus: expressify(async (req, res) => {
    await userMutation(
      req,
      res,
      setStatusSchema,
      async (params, body) => {
        if (
          getSessionUserId(req) === params.userId.toString() &&
          body.status !== 'active'
        ) {
          throw new UnderleafUserError(
            'own_admin',
            'You cannot disable your own administrator account.'
          )
        }
        return await UnderleafUserManager.updateUser(params.userId, body)
      },
      'User status updated.'
    )
  }),

  deleteUser: expressify(async (req, res) => {
    const { params, body } = parseReq(req, deleteUserSchema)
    if (body.projectAction === 'cancel') {
      respond(req, res, 'User deletion cancelled.', { cancelled: true })
      return
    }
    try {
      if (getSessionUserId(req) === params.userId.toString()) {
        throw new UnderleafUserError(
          'own_account',
          'You cannot delete your own account.'
        )
      }
      await UnderleafUserManager.deleteUser(params.userId, {
        deleterUser: SessionManager.getSessionUser(req.session),
        ipAddress: req.ip,
        deleteProjects: true,
      })
      respond(req, res, 'User and all owned projects deleted.', {
        id: params.userId.toString(),
      })
    } catch (error) {
      if (!handleUserError(req, res, error)) throw error
    }
  }),
}

export default UnderleafAdminController
