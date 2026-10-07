import SessionManager from '../Authentication/SessionManager.mjs'

function noop() {}
async function noopAsync() {}

function getIdsFromSession(session) {
  return {
    analyticsId: session?.analyticsId,
    userId: SessionManager.getLoggedInUserId(session),
  }
}

async function analyticsIdMiddleware(req, _res, next) {
  next()
}

export default {
  identifyUser: noop,
  recordEventForSession: noop,
  recordEventForUser: noopAsync,
  recordEventForUserInBackground: noop,
  recordEventForMongoUser: noopAsync,
  recordEventForMongoUserInBackground: noop,
  emitPackageUsage: noop,
  setUserPropertyForUser: noopAsync,
  setUserPropertyForUserInBackground: noop,
  setUserPropertyForMongoUser: noopAsync,
  setUserPropertyForMongoUserInBackground: noop,
  setUserPropertyForSession: noopAsync,
  setUserPropertyForSessionInBackground: noop,
  setUserPropertyForAnalyticsId: noopAsync,
  updateEditingSession: noop,
  getIdsFromSession,
  registerAccountMapping: noop,
  registerEmailChange: noop,
  analyticsIdMiddleware,
}
