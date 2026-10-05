import UserGetter from './UserGetter.mjs'
import OError from '@overleaf/o-error'
import UserSessionsManager from './UserSessionsManager.mjs'
import logger from '@overleaf/logger'
import Settings from '@overleaf/settings'
import AuthenticationController from '../Authentication/AuthenticationController.mjs'
import SessionManager from '../Authentication/SessionManager.mjs'
import { expressify } from '@overleaf/promise-utils'
import Modules from '../../infrastructure/Modules.mjs'
import {
  z,
  parseReq,
  getRawReqInput,
} from '../../infrastructure/Validation.mjs'

function popSessionValue(session, key) {
  const value = session[key]
  if (value) {
    delete session[key]
  }
  return value
}

async function settingsPage(req, res) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  const projectSyncSuccessMessage = popSessionValue(
    req.session,
    'projectSyncSuccessMessage'
  )
  const projectSyncErrorMessage = popSessionValue(
    req.session,
    'projectSyncErrorMessage'
  )
  const referenceLinkingErrorMessage = popSessionValue(
    req.session,
    'referenceLinkingErrorMessage'
  )
  const user = await UserGetter.promises.getUser(userId)
  if (!user) {
    // The user has just deleted their account.
    return UserSessionsManager.removeSessionsFromRedis(
      { _id: userId },
      null,
      () => res.redirect('/')
    )
  }

  let personalAccessTokens
  try {
    const results = await Modules.promises.hooks.fire(
      'listPersonalAccessTokens',
      user._id
    )
    personalAccessTokens = results?.[0] ?? []
  } catch (error) {
    const err = OError.tag(error, 'listPersonalAccessTokens hook failed')
    logger.error({ err, userId }, err.message)
  }

  res.render('user/settings', {
    title: 'account_settings',
    user: {
      id: user._id,
      isAdmin: user.isAdmin,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      allowedFreeTrial: user.allowedFreeTrial,
      first_name: user.first_name,
      last_name: user.last_name,
      alphaProgram: user.alphaProgram,
      betaProgram: user.betaProgram,
      labsProgram: user.labsProgram,
      features: {
        dropbox: user.features?.dropbox,
        github: user.features?.github,
        mendeley: user.features?.mendeley,
        zotero: user.features?.zotero,
        papers: user.features?.papers,
        references: user.features?.references,
      },
      refProviders: {
        mendeley: Boolean(user.refProviders?.mendeley),
        zotero: Boolean(user.refProviders?.zotero),
        papers: Boolean(user.refProviders?.papers),
      },
    },
    showAiFeatures: Boolean(user.aiFeatures?.enabled),
    labsExperiments: user.labsExperiments ?? [],
    hasPassword: !!user.passwordHash,
    projectSyncSuccessMessage,
    projectSyncErrorMessage,
    referenceLinkingErrorMessage,
    personalAccessTokens,
    userRestrictions: Array.from(req.userRestrictions || []),
    gitBridgeEnabled: Settings.enableGitBridge,
    capabilities: [...(req.capabilitySet || [])],
  })
}

async function accountSuspended(req, res) {
  if (SessionManager.isUserLoggedIn(req.session)) {
    return res.redirect('/project')
  }
  res.render('user/accountSuspended', {
    title: 'your_account_is_suspended',
  })
}

async function logout(req, res) {
  const isLoggedIn = SessionManager.isUserLoggedIn(req.session)
  if (!isLoggedIn) {
    return res.redirect('/')
  }
  res.render('user/logout')
}

const loginPageSchema = z.object({
  query: z.object({
    redir: z.string().optional(),
  }),
})

const UserPagesController = {
  accountSuspended: expressify(accountSuspended),
  logout: expressify(logout),

  loginPage(req, res) {
    const { query } = parseReq(req, loginPageSchema, { logOnly: true })

    // if user is being sent to /login with explicit redirect (redir=/foo),
    // such as being sent from the editor to /login, then set the redirect explicitly
    if (
      query.redir != null &&
      AuthenticationController.getRedirectFromSession(req) == null
    ) {
      AuthenticationController.setRedirectInSession(req, query.redir)
    }
    const metadata = { robotsNoindexNofollow: false }
    // any query param at all (not just `redir`) marks this page as noindex
    // -- e.g. error/SSO-flow flags added by other callers -- read the raw
    // query here rather than by name (case 1: verbatim forwarding)
    if (Object.keys(getRawReqInput(req).query).length !== 0) {
      metadata.robotsNoindexNofollow = true
    }
    res.set('Cache-Control', 'no-store')
    res.render('underleaf/auth', {
      authPage: 'login',
      title: Settings.nav?.login_support_title || 'login',
      login_support_title: Settings.nav?.login_support_title,
      login_support_text: Settings.nav?.login_support_text,
      metadata,
    })
  },

  settingsPage: expressify(settingsPage),

  sessionsPage(req, res, next) {
    const user = SessionManager.getSessionUser(req.session)
    logger.debug({ userId: user._id }, 'loading sessions page')
    const currentSession = {
      ip_address: user.ip_address,
      session_created: user.session_created,
    }
    UserSessionsManager.getAllUserSessions(
      user,
      [req.sessionID],
      (err, sessions) => {
        if (err != null) {
          OError.tag(err, 'error getting all user sessions', {
            userId: user._id,
          })
          return next(err)
        }
        res.render('user/sessions', {
          title: 'sessions',
          currentSession,
          sessions,
        })
      }
    )
  },
}

export default UserPagesController
