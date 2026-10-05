import logger from '@overleaf/logger'
import { db } from '../../infrastructure/mongodb.mjs'
import Mongo from '../Helpers/Mongo.mjs'
import { callbackify } from 'node:util'
import UserGetter from './UserGetter.mjs'
import Errors from '../Errors/Errors.js'
import UserAuditLogHandler from './UserAuditLogHandler.mjs'
import Modules from '../../infrastructure/Modules.mjs'
import UserSessionsManager from './UserSessionsManager.mjs'
import ThirdPartyIdentityManager from './ThirdPartyIdentityManager.mjs'

const { normalizeQuery } = Mongo
const retiredFields = new Set([
  'email',
  'emails',
  'hashedPassword',
  'password',
  'must_reconfirm',
  'lastPrimaryEmailCheck',
  'onboardingEmailSentAt',
])
const isRetiredField = path =>
  typeof path === 'string' && retiredFields.has(path.split('.')[0])

async function retiredEmailIdentity() {
  throw new Error(
    'Email identity is unavailable. Use username account administration.'
  )
}

async function clearSAMLData(userId) {
  await updateUser(userId, {
    $unset: { samlIdentifiers: 1, 'enrollment.sso': 1 },
  })
}

async function clearThirdPartyIdentifiers(userId, auditLog) {
  const user = await UserGetter.promises.getUser(userId, {
    thirdPartyIdentifiers: 1,
  })
  await UserAuditLogHandler.promises.addEntry(
    userId,
    'clear-third-party-identifiers',
    auditLog.initiatorId,
    auditLog.ipAddress,
    {}
  )
  for (const thirdPartyIdentifier of user.thirdPartyIdentifiers || []) {
    await ThirdPartyIdentityManager.promises.unlink(
      userId,
      thirdPartyIdentifier.providerId,
      auditLog
    )
  }
}

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
        (operator === '$rename' && isRetiredField(value))
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

// Explicitly reject retired write interfaces used by inherited scripts/modules.
const promises = {
  addAffiliationForNewUser: retiredEmailIdentity,
  addEmailAddress: retiredEmailIdentity,
  changeEmailAddress: retiredEmailIdentity,
  confirmEmail: retiredEmailIdentity,
  removeEmailAddress: retiredEmailIdentity,
  removeReconfirmFlag: retiredEmailIdentity,
  setDefaultEmailAddress: retiredEmailIdentity,
  migrateDefaultEmailAddress: retiredEmailIdentity,
  clearSAMLData,
  clearThirdPartyIdentifiers,
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
