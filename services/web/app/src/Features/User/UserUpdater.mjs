import logger from '@overleaf/logger'
import { db } from '../../infrastructure/mongodb.mjs'
import Mongo from '../Helpers/Mongo.mjs'
import { callbackify } from 'node:util'
import Errors from '../Errors/Errors.js'
import UserAuditLogHandler from './UserAuditLogHandler.mjs'
import Modules from '../../infrastructure/Modules.mjs'
import UserSessionsManager from './UserSessionsManager.mjs'

const { normalizeQuery } = Mongo
const retiredFields = new Set([
  'email',
  'emails',
  'hashedPassword',
  'password',
  'must_reconfirm',
  'lastPrimaryEmailCheck',
  'onboardingEmailSentAt',
  'samlIdentifiers',
  'thirdPartyIdentifiers',
])
const isRetiredField = path =>
  typeof path === 'string' &&
  (retiredFields.has(path.split('.')[0]) ||
    path === 'enrollment.sso' ||
    path.startsWith('enrollment.sso.'))

async function updateUser(query, update) {
  if (!update || Array.isArray(update) || typeof update !== 'object') {
    throw new Error('User updates must use field operators.')
  }
  for (const [operator, fields] of Object.entries(update)) {
    if (!operator.startsWith('$') || !fields || typeof fields !== 'object') {
      throw new Error('User updates must use field operators.')
    }
    if (operator === '$unset') continue
    for (const [field, value] of Object.entries(fields)) {
      if (
        isRetiredField(field) ||
        (operator === '$rename' && isRetiredField(value)) ||
        (field === 'enrollment' && value && Object.hasOwn(value, 'sso'))
      ) {
        throw new Error(
          'Cannot restore retired email or password identity fields.'
        )
      }
    }
  }
  return await db.users.updateOne(normalizeQuery(query), update)
}

async function suspendUser(userId, auditLog = {}) {
  const res = await updateUser(
    { _id: userId, status: { $ne: 'disabled' } },
    {
      $set: { suspended: true, status: 'disabled', updatedAt: new Date() },
      $inc: { identityVersion: 1 },
    }
  )
  if (res.matchedCount !== 1) {
    throw new Errors.NotFoundError('user id not found or already suspended')
  }
  await UserAuditLogHandler.promises.addEntry(
    userId,
    'account-suspension',
    auditLog.initiatorId,
    auditLog.ip,
    auditLog.info || {}
  )
  await UserSessionsManager.promises.removeSessionsFromRedis({ _id: userId })
  await Modules.promises.hooks.fire(
    'removeDropbox',
    userId,
    'account-suspension'
  )
}

// Account metadata updates and suspension; identity changes use UnderleafUserManager.
const promises = {
  updateUser,
  suspendUser,
}

export default {
  ...Object.fromEntries(
    Object.entries(promises).map(([name, handler]) => [
      name,
      callbackify(handler),
    ])
  ),
  promises,
}
