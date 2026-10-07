import { callbackify } from 'node:util'

function emptySubscriptionDetails() {
  return {
    bestSubscription: { type: 'free' },
    individualSubscription: null,
    memberGroupSubscriptions: [],
    managedGroupSubscriptions: [],
    currentInstitutionsWithLicence: [],
  }
}

async function getUsersSubscriptionDetails() {
  return emptySubscriptionDetails()
}

async function buildUsersSubscriptionViewModel() {
  return {
    ...emptySubscriptionDetails(),
    personalSubscription: null,
    managedInstitutions: [],
    managedPublishers: [],
  }
}

function buildPlansList() {
  return { allPlans: {} }
}

function buildPlansListForSubscriptionDash() {
  return { plans: [], planCodesChangingAtTermEnd: [] }
}

export default {
  buildUsersSubscriptionViewModel: callbackify(buildUsersSubscriptionViewModel),
  buildPlansList,
  buildPlansListForSubscriptionDash,
  promises: {
    buildUsersSubscriptionViewModel,
    getUsersSubscriptionDetails,
  },
}
