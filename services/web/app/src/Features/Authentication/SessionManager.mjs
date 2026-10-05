import _ from 'lodash'

const SessionManager = {
  getSessionUser(session) {
    const sessionUser = _.get(session, ['user'])
    const sessionPassportUser = _.get(session, ['passport', 'user'])
    const user = sessionUser || sessionPassportUser || null
    // Reject sessions from before the identity migration (including Redis/socket sessions).
    if (!user?.username || user.identityVersion === undefined) return null
    delete user.email
    delete user.emails
    return user
  },

  setInSessionUser(session, props) {
    const sessionUser = SessionManager.getSessionUser(session)
    if (!sessionUser) {
      return
    }
    for (const key in props) {
      const value = props[key]
      sessionUser[key] = value
    }
    return null
  },

  isUserLoggedIn(session) {
    const userId = SessionManager.getLoggedInUserId(session)
    return ![null, undefined, false].includes(userId)
  },

  getLoggedInUserId(session) {
    const user = SessionManager.getSessionUser(session)
    if (user) {
      return user._id
    } else {
      return null
    }
  },

  getLoggedInUserV1Id(session) {
    const user = SessionManager.getSessionUser(session)
    if (user != null && user.v1_id != null) {
      return user.v1_id
    } else {
      return null
    }
  },
}

export default SessionManager
