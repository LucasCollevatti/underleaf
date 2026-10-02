import { expressify } from '@overleaf/promise-utils'
import { db } from '../../infrastructure/mongodb.mjs'
import { parseReq, z, zz } from '../../infrastructure/Validation.mjs'
import CollaboratorsController from '../Collaborators/CollaboratorsController.mjs'
import CollaboratorsGetter from '../Collaborators/CollaboratorsGetter.mjs'
import CollaboratorsHandler from '../Collaborators/CollaboratorsHandler.mjs'
import EditorRealTimeController from '../Editor/EditorRealTimeController.mjs'
import HttpErrorHandler from '../Errors/HttpErrorHandler.mjs'
import LimitationsManager from '../Subscription/LimitationsManager.mjs'
import PrivilegeLevels from '../Authorization/PrivilegeLevels.mjs'
import SessionManager from '../Authentication/SessionManager.mjs'
import { normalizeUsername } from './UnderleafUserManager.mjs'

const permissionToPrivilegeLevel = {
  editor: PrivilegeLevels.READ_AND_WRITE,
  viewer: PrivilegeLevels.READ_ONLY,
}

const searchUsersSchema = z.object({
  query: z.strictObject({ username: z.string() }),
})

const addUserSchema = z.object({
  params: z.strictObject({ Project_id: zz.objectId() }),
  body: z.strictObject({
    username: z.string(),
    permission: z.enum(['editor', 'viewer']),
  }),
})

const removeUserSchema = z.object({
  params: z.strictObject({
    Project_id: zz.objectId(),
    username: z.string(),
  }),
})

async function findUserByUsername(username, { activeOnly = true } = {}) {
  const normalizedUsername = normalizeUsername(username)
  if (!normalizedUsername) return null

  const query = { username: normalizedUsername }
  if (activeOnly) query.status = 'active'

  return await db.users.findOne(query, {
    projection: {
      _id: 1,
      username: 1,
      displayName: 1,
      role: 1,
      email: 1,
    },
  })
}

function respondUserNotFound(res) {
  return res.status(404).json({
    error: 'user_not_found',
    message: 'User not found',
  })
}

function respondOwnerConflict(res) {
  return res.status(409).json({
    error: 'owner_cannot_be_removed',
    message: 'The project owner cannot be managed as a collaborator.',
  })
}

async function searchUsers(req, res) {
  const { query } = parseReq(req, searchUsersSchema)
  const user = await findUserByUsername(query.username)
  if (!user) return respondUserNotFound(res)

  res.json({
    user: {
      id: user._id.toString(),
      username: user.username,
      displayName: user.displayName || user.username,
      role: user.role || 'user',
    },
  })
}

async function addUserByUsername(req, res) {
  const { params, body } = parseReq(req, addUserSchema)
  const projectId = params.Project_id
  const sessionUserId = SessionManager.getLoggedInUserId(req.session)
  const user = await findUserByUsername(body.username)
  if (!user) return respondUserNotFound(res)

  const projectAccess =
    await CollaboratorsGetter.promises.getProjectAccess(projectId)
  const currentPrivilegeLevel = projectAccess.privilegeLevelForUser(user._id)
  if (currentPrivilegeLevel === PrivilegeLevels.OWNER) {
    return respondOwnerConflict(res)
  }

  const privilegeLevel = permissionToPrivilegeLevel[body.permission]
  if (currentPrivilegeLevel !== privilegeLevel) {
    const allowed =
      await LimitationsManager.promises.canChangeCollaboratorPrivilegeLevel(
        projectId,
        user._id,
        privilegeLevel
      )
    if (!allowed) {
      return HttpErrorHandler.forbidden(
        req,
        res,
        'edit collaborator limit reached'
      )
    }

    if (currentPrivilegeLevel === PrivilegeLevels.NONE) {
      await CollaboratorsHandler.promises.addUserIdToProject(
        projectId,
        sessionUserId,
        user._id,
        privilegeLevel
      )
    } else {
      await CollaboratorsHandler.promises.setCollaboratorPrivilegeLevel(
        projectId,
        user._id,
        privilegeLevel,
        {},
        {
          ipAddress: req.ip,
          initiatorId: sessionUserId,
        }
      )
    }

    EditorRealTimeController.emitToRoom(
      projectId,
      'project:collaboratorAccessLevel:changed',
      { userId: user._id }
    )
  }

  EditorRealTimeController.emitToRoom(projectId, 'project:membership:changed', {
    members: true,
  })
  res.json({ username: user.username, permission: body.permission })
}

async function removeUserByUsername(req, res, next) {
  const { params } = parseReq(req, removeUserSchema)
  const user = await findUserByUsername(params.username, { activeOnly: false })
  if (!user) return respondUserNotFound(res)

  const projectAccess =
    await CollaboratorsGetter.promises.getProjectAccess(params.Project_id)
  if (
    projectAccess.privilegeLevelForUser(user._id) === PrivilegeLevels.OWNER
  ) {
    return respondOwnerConflict(res)
  }

  req.params.user_id = user._id.toString()
  delete req.params.username
  return CollaboratorsController.removeUserFromProject(req, res, next)
}

export default {
  searchUsers: expressify(searchUsers),
  addUserByUsername: expressify(addUserByUsername),
  removeUserByUsername: expressify(removeUserByUsername),
}
