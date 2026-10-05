import { expressify } from '@overleaf/promise-utils'
import SessionManager from '../Authentication/SessionManager.mjs'
import UnderleafUserManager, {
  UnderleafUserError,
} from './UnderleafUserManager.mjs'
import { db } from '../../infrastructure/mongodb.mjs'
import { parseReq, z, zz } from '../../infrastructure/Validation.mjs'

const createUserSchema = z.object({
  body: z.strictObject({
    username: z.string(),
    displayName: z.string().optional(),
    password: z.string(),
    role: z.enum(['admin', 'user']),
  }),
})

const updateUserSchema = z.object({
  params: z.object({ userId: zz.objectId() }),
  body: z.strictObject({
    username: z.string(),
    displayName: z.string(),
    password: z.string().optional(),
    role: z.enum(['admin', 'user']),
    status: z.enum(['active', 'disabled']),
  }),
})

const deleteUserSchema = z.object({
  params: z.object({ userId: zz.objectId() }),
  body: z.strictObject({
    confirm: z.literal('DELETE'),
    projectAction: z.enum(['cancel', 'delete']),
  }),
})

function redirectWithMessage(res, name, message) {
  res.redirect(`/admin/users?${name}=${encodeURIComponent(message)}`)
}

function getSessionUserId(req) {
  return SessionManager.getLoggedInUserId(req.session)?.toString()
}

async function renderUserList(req, res) {
  const users = await UnderleafUserManager.listUsers()
  res.render('underleaf/admin-users', {
    title: 'Underleaf users',
    users,
  })
}

function handleUserError(res, error) {
  if (!(error instanceof UnderleafUserError)) return false
  redirectWithMessage(res, 'error', error.message)
  return true
}

const UnderleafAdminController = {
  index: expressify(async (req, res) => {
    const [users, projectCount] = await Promise.all([
      UnderleafUserManager.listUsers(),
      db.projects.countDocuments({ active: true }),
    ])
    const activeUsers = users.filter(user => user.status === 'active').length
    const adminUsers = users.filter(
      user => user.role === 'admin' || user.isAdmin
    ).length
    res.render('underleaf/admin', {
      title: 'Underleaf administration',
      activeUsers,
      adminUsers,
      projectCount,
      userCount: users.length,
    })
  }),

  users: expressify(renderUserList),

  createUser: expressify(async (req, res) => {
    const { body } = parseReq(req, createUserSchema)
    try {
      await UnderleafUserManager.createUser(body)
      redirectWithMessage(res, 'notice', 'User created.')
    } catch (error) {
      if (!handleUserError(res, error)) throw error
    }
  }),

  updateUser: expressify(async (req, res) => {
    const { params, body } = parseReq(req, updateUserSchema)
    const currentUserId = getSessionUserId(req)
    const isCurrentUser = currentUserId === params.userId.toString()
    if (isCurrentUser && (body.role !== 'admin' || body.status !== 'active')) {
      redirectWithMessage(
        res,
        'error',
        'You cannot remove your own administrator access.'
      )
      return
    }

    try {
      await UnderleafUserManager.updateUser(params.userId, {
        ...body,
        password: body.password || undefined,
      })
      redirectWithMessage(res, 'notice', 'User updated.')
    } catch (error) {
      if (!handleUserError(res, error)) throw error
    }
  }),

  deleteUser: expressify(async (req, res) => {
    const { params, body } = parseReq(req, deleteUserSchema)
    if (body.projectAction === 'cancel') {
      redirectWithMessage(res, 'notice', 'User deletion cancelled.')
      return
    }
    if (getSessionUserId(req) === params.userId.toString()) {
      redirectWithMessage(res, 'error', 'You cannot delete your own account.')
      return
    }

    try {
      const deleterUser = SessionManager.getSessionUser(req.session)
      await UnderleafUserManager.deleteUser(params.userId, {
        deleterUser,
        ipAddress: req.ip,
        deleteProjects: true,
      })
      redirectWithMessage(res, 'notice', 'User and owned projects deleted.')
    } catch (error) {
      if (!handleUserError(res, error)) throw error
    }
  }),
}

export default UnderleafAdminController
