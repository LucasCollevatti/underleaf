import { callbackify } from 'node:util'
import { db } from '../../infrastructure/mongodb.mjs'
import Mongo from '../Helpers/Mongo.mjs'
import Modules from '../../infrastructure/Modules.mjs'
import FeaturesHelper from '../Subscription/FeaturesHelper.mjs'

const { normalizeQuery, normalizeMultiQuery } = Mongo

async function getUserFeatures(userId) {
  const user = await UserGetter.promises.getUser(userId, {
    features: 1,
  })
  if (!user) {
    throw new Error('User not Found')
  }

  const moduleFeatures =
    (await Modules.promises.hooks.fire('getModuleProvidedFeatures', userId)) ||
    []

  return FeaturesHelper.computeFeatureSet([user.features, ...moduleFeatures])
}

async function getWritefullData(userId) {
  const user = await UserGetter.promises.getUser(userId, {
    writefull: 1,
  })
  if (!user) {
    throw new Error('user not found')
  }
  return {
    isPremium: Boolean(user?.writefull?.isPremium),
    premiumSource: user?.writefull?.premiumSource || null,
  }
}

async function getUser(query, projection = {}) {
  query = normalizeQuery(query)
  return await db.users.findOne(query, { projection })
}

async function getUsersByV1Ids(v1Ids, projection = {}) {
  const query = { 'overleaf.id': { $in: v1Ids } }
  return await db.users.find(query, { projection }).toArray()
}

async function getUsers(query, projection) {
  query = normalizeMultiQuery(query)
  if (query?._id?.$in?.length === 0) return [] // shortcut for getUsers([])
  return await db.users.find(query, { projection }).toArray()
}

// Retired read interfaces cannot resolve an Underleaf account by email or SSO.
// Inherited integrations still call some of these; empty results keep them inert.
async function getUserEmail() {
  return undefined
}
async function getUserByMainEmail() {
  return null
}
async function getUserByAnyEmail() {
  return null
}
async function getUserFullEmails() {
  return []
}
async function getUserConfirmedEmails() {
  return []
}
async function getUsersByAnyConfirmedEmail() {
  return []
}
async function getUsersByHostname() {
  return []
}
async function getInstitutionUsersByHostname() {
  return []
}
async function getSsoUsersAtInstitution() {
  return []
}
async function ensureUniqueEmailAddress() {
  throw new Error('Email identity is unavailable. Use a username.')
}

const UserGetter = {
  getSsoUsersAtInstitution: callbackify(getSsoUsersAtInstitution),
  getUser: callbackify(getUser),
  getUserFeatures: callbackify(getUserFeatures),
  getUserEmail: callbackify(getUserEmail),
  getUserFullEmails: callbackify(getUserFullEmails),
  getUserConfirmedEmails: callbackify(getUserConfirmedEmails),
  getUserByMainEmail: callbackify(getUserByMainEmail),
  getUserByAnyEmail: callbackify(getUserByAnyEmail),
  getUsersByAnyConfirmedEmail: callbackify(getUsersByAnyConfirmedEmail),
  getUsersByV1Ids: callbackify(getUsersByV1Ids),
  getUsersByHostname: callbackify(getUsersByHostname),
  getInstitutionUsersByHostname: callbackify(getInstitutionUsersByHostname),
  getUsers: callbackify(getUsers),
  // check for duplicate email address. This is also enforced at the DB level
  ensureUniqueEmailAddress: callbackify(ensureUniqueEmailAddress),
  getWritefullData: callbackify(getWritefullData),

  promises: {
    getSsoUsersAtInstitution,
    getUser,
    getUserFeatures,
    getUserEmail,
    getUserFullEmails,
    getUserConfirmedEmails,
    getUserByMainEmail,
    getUserByAnyEmail,
    getUsersByAnyConfirmedEmail,
    getUsersByV1Ids,
    getUsersByHostname,
    getInstitutionUsersByHostname,
    getUsers,
    ensureUniqueEmailAddress,
    getWritefullData,
  },
}

export default UserGetter
