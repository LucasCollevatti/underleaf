import { callbackify } from 'node:util'
import TeamInvitesHandler from '../Subscription/TeamInvitesHandler.mjs'
import { db, READ_PREFERENCE_SECONDARY } from '../../infrastructure/mongodb.mjs'

async function populateTeamInvites(user) {
  if (!user.email) return
  return await TeamInvitesHandler.promises.createTeamInvitesForLegacyInvitedEmail(
    user.email
  )
}

async function countActiveUsers() {
  const oneYearAgo = new Date()
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
  return await db.users.countDocuments(
    { lastActive: { $gte: oneYearAgo } },
    { readPreference: READ_PREFERENCE_SECONDARY }
  )
}

export default {
  populateTeamInvites: callbackify(populateTeamInvites),
  countActiveUsers: callbackify(countActiveUsers),
  promises: {
    populateTeamInvites,
    countActiveUsers,
  },
}
