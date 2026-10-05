import { User } from '../../models/User.mjs'
import SessionManager from './SessionManager.mjs'
import OError from '@overleaf/o-error'
import LoginRateLimiter from '../Security/LoginRateLimiter.mjs'
import UserUpdater from '../User/UserUpdater.mjs'
import Metrics from '@overleaf/metrics'
import logger from '@overleaf/logger'
import querystring from 'node:querystring'
import Settings from '@overleaf/settings'
import basicAuth from 'basic-auth'
import tsscmp from 'tsscmp'
import UserSessionsManager from '../User/UserSessionsManager.mjs'
import Analytics from '../Analytics/AnalyticsManager.mjs'
import passport from 'passport'
import NotificationsBuilder from '../Notifications/NotificationsBuilder.mjs'
import UrlHelper from '../Helpers/UrlHelper.mjs'
import AsyncFormHelper from '../Helpers/AsyncFormHelper.mjs'
import { getRawReqInput } from '../../infrastructure/Validation.mjs'
import _ from 'lodash'
import UserAuditLogHandler from '../User/UserAuditLogHandler.mjs'
import AnalyticsRegistrationSourceHelper from '../Analytics/AnalyticsRegistrationSourceHelper.mjs'
import { acceptsJson } from '../../infrastructure/RequestContentTypeDetection.mjs'
import AdminAuthorizationHelper from '../Helpers/AdminAuthorizationHelper.mjs'
import Modules from '../../infrastructure/Modules.mjs'
import { expressify, promisify } from '@overleaf/promise-utils'
import SplitTestHandler from '../SplitTests/SplitTestHandler.mjs'
import UnderleafUserManager from '../Underleaf/UnderleafUserManager.mjs'

const { hasAdminAccess } = AdminAuthorizationHelper

function send401WithChallenge(res) {
  res.setHeader('WWW-Authenticate', 'OverleafLogin')
  res.sendStatus(401)
}

function checkCredentials(userDetailsMap, user, password) {
  const expectedPassword = userDetailsMap.get(user)
  const userExists = userDetailsMap.has(user) && expectedPassword // user exists with a non-null password

  let isValid = false
  if (userExists) {
    if (Array.isArray(expectedPassword)) {
      const isValidPrimary = Boolean(
        expectedPassword[0] && tsscmp(expectedPassword[0], password)
      )
      const isValidFallback = Boolean(
        expectedPassword[1] && tsscmp(expectedPassword[1], password)
      )
      isValid = isValidPrimary || isValidFallback
    } else {
      isValid = tsscmp(expectedPassword, password)
    }
  }

  if (!isValid) {
    logger.err({ user }, 'invalid login details')
  }
  Metrics.inc('security.http-auth.check-credentials', 1, {
    path: userExists ? 'known-user' : 'unknown-user',
    status: isValid ? 'pass' : 'fail',
  })
  return isValid
}

// Map a thrown @node-oauth/oauth2-server error to a stable, machine-readable
// code that callers (e.g. git-bridge) can switch on. err.name values come
// from the library's error classes (snake_case OAuth standard names per
// RFC 6749/6750). The token_expired distinction is driven by a marker we
// set ourselves in Oauth2ServerModel.getAccessToken, so it survives library
// upgrades that might change error_description text.
function _classifyOauthError(err) {
  switch (err?.name) {
    case 'invalid_token':
      return err.overleafErrorCode === 'token_expired'
        ? 'token_expired'
        : 'token_invalid'
    case 'invalid_request':
      return err.overleafErrorCode === 'token_malformed'
        ? 'token_malformed'
        : 'invalid_request'
    case 'insufficient_scope':
      return 'insufficient_scope'
    case 'unauthorized_request':
      return 'unauthorized_request'
    default:
      return 'unknown'
  }
}

// TODO: Finish making these methods async
const AuthenticationController = {
  serializeUser(user, callback) {
    if (
      !user?._id ||
      !user.username ||
      user.status !== 'active' ||
      !Number.isInteger(user.identityVersion) ||
      user.identityVersion < 1
    ) {
      const err = new Error('serializeUser called with non-user object')
      logger.warn({ user }, err.message)
      return callback(err)
    }
    const lightUser = {
      _id: user._id,
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      status: user.status,
      identityVersion: user.identityVersion,
      first_name: user.first_name,
      last_name: user.last_name || '',
      referal_id: user.referal_id,
      session_created: new Date().toISOString(),
      ip_address: user._login_req_ip,
      v1_id: user.overleaf != null ? user.overleaf.id : undefined,
      analyticsId: user.analyticsId || user._id,
      alphaProgram: user.alphaProgram || undefined, // only store if set
      betaProgram: user.betaProgram || undefined, // only store if set
      labsProgram: user.labsProgram, // always store, we could revert about 1 week after deploying this change.
    }
    if (user.isAdmin) {
      lightUser.isAdmin = true
      lightUser.adminRoles = user.adminRoles
    }

    callback(null, lightUser)
  },

  deserializeUser(user, cb) {
    if (
      !user?.username ||
      !Number.isInteger(user.identityVersion) ||
      user.identityVersion < 1
    )
      return cb(null, false)
    User.findById(
      user._id,
      'username displayName role status isAdmin suspended identityVersion first_name last_name'
    )
      .lean()
      .exec()
      .then(current => {
        if (
          !current ||
          current.status !== 'active' ||
          current.suspended ||
          current.identityVersion !== user.identityVersion
        ) {
          return cb(null, false)
        }
        // Passport stores the serialized object in req.session.passport.user.
        // Refresh that same object: middleware and sockets read the session too.
        const sessionUser = Object.assign(user, current)
        delete sessionUser.email
        delete sessionUser.emails
        cb(null, sessionUser)
      }, cb)
  },

  passportLogin(req, res, next) {
    // This function is middleware which wraps the passport.authenticate middleware,
    // so we can send back our custom `{message: {text: "", type: ""}}` responses on failure,
    // and send a `{redir: ""}` response on success
    passport.authenticate(
      'local',
      { keepSessionInfo: true },
      async function (err, user, info) {
        if (err) {
          return next(err)
        }
        if (user) {
          // `user` is either a user object or false
          AuthenticationController.setAuditInfo(req, {
            method: 'Password login',
          })

          try {
            // We could investigate whether this can be done together with 'preFinishLogin' instead of being its own hook
            await Modules.promises.hooks.fire(
              'saasLogin',
              { username: user.username },
              req
            )
            await AuthenticationController.promises.finishLogin(user, req, res)
          } catch (err) {
            return next(err)
          }
        } else {
          if (info.redir != null) {
            return res.json({ redir: info.redir })
          } else {
            res.status(info.status || 200)
            delete info.status
            const body = { message: info }
            const { errorReason } = info
            if (errorReason) {
              body.errorReason = errorReason
              delete info.errorReason
            }
            return res.json(body)
          }
        }
      }
    )(req, res, next)
  },

  async _finishLoginAsync(user, req, res) {
    if (user === false) {
      return AsyncFormHelper.redirect(req, res, '/login')
    } // OAuth2 'state' mismatch

    if (!user?.username || user.status !== 'active' || user.suspended) {
      return AsyncFormHelper.redirect(req, res, '/account-suspended')
    }

    if (Settings.adminOnlyLogin && !hasAdminAccess(user)) {
      return res.status(403).json({
        message: { type: 'error', text: 'Admin only panel' },
      })
    }

    const auditInfo = AuthenticationController.getAuditInfo(req)

    const anonymousAnalyticsId = req.session.analyticsId
    const isNewUser = req.session.justRegistered || false

    const results = await Modules.promises.hooks.fire(
      'preFinishLogin',
      req,
      res,
      user
    )

    if (results.some(result => result && result.doNotFinish)) {
      return
    }

    const redir =
      AuthenticationController.getRedirectFromSession(req) || '/project'

    _loginAsyncHandlers(req, user, anonymousAnalyticsId, isNewUser)
    const userId = user._id

    await UserAuditLogHandler.promises.addEntry(
      userId,
      'login',
      userId,
      req.ip,
      auditInfo
    )

    await _afterLoginSessionSetupAsync(req, user)

    AuthenticationController._clearRedirectFromSession(req)
    AnalyticsRegistrationSourceHelper.clearSource(req.session)
    AnalyticsRegistrationSourceHelper.clearInbound(req.session)
    AsyncFormHelper.redirect(req, res, redir)
  },

  finishLogin(user, req, res, next) {
    AuthenticationController._finishLoginAsync(user, req, res).catch(err =>
      next(err)
    )
  },

  async doPassportLogin(req, username, password, done) {
    let user, info
    try {
      ;({ user, info } = await AuthenticationController._doPassportLogin(
        req,
        username,
        password
      ))
    } catch (error) {
      return done(error)
    }
    return done(undefined, user, info)
  },

  /**
   *
   * @param req
   * @param username
   * @param password
   * @returns {Promise<{ user: any, info: any}>}
   */
  async _doPassportLogin(req, username, password) {
    const { user, reason } = await UnderleafUserManager.authenticate(
      username,
      password
    )
    if (user) {
      AuthenticationController.setAuditInfo(req, {
        method: 'Username password login',
      })
      return { user, info: undefined }
    }

    if (reason === 'disabled') {
      return {
        user: false,
        info: {
          type: 'error',
          text: 'This account is disabled.',
          status: 403,
        },
      }
    }

    Metrics.inc('login_failure_reason', 1, { status: 'password_invalid' })
    AuthenticationController._recordFailedLogin()
    return {
      user: false,
      info: {
        type: 'error',
        text: 'Invalid username or password.',
        status: 401,
      },
    }
  },

  captchaRequiredForLogin(req, user) {
    switch (AuthenticationController.getAuditInfo(req).captcha) {
      case 'trusted':
      case 'disabled':
        return false
      case 'solved':
        return false
      case 'skipped': {
        let required = false
        if (user.lastFailedLogin) {
          const requireCaptchaUntil =
            user.lastFailedLogin.getTime() +
            Settings.elevateAccountSecurityAfterFailedLogin
          required = requireCaptchaUntil >= Date.now()
        }
        Metrics.inc('force_captcha_on_login', 1, {
          status: required ? 'yes' : 'no',
        })
        return required
      }
      default:
        throw new Error('captcha middleware missing in handler chain')
    }
  },

  ipMatchCheck(req, user) {
    if (!Settings.underleaf && req.ip !== user.lastLoginIp) {
      NotificationsBuilder.ipMatcherAffiliation(user._id.toString()).create(
        req.ip,
        () => {}
      )
    }
    return UserUpdater.updateUser(
      user._id.toString(),
      {
        $set: { lastLoginIp: req.ip },
      },
      () => {}
    )
  },

  requireLogin() {
    const doRequest = function (req, res, next) {
      if (next == null) {
        next = function () {}
      }
      if (!SessionManager.isUserLoggedIn(req.session)) {
        if (acceptsJson(req)) return send401WithChallenge(res)
        return AuthenticationController._redirectToLoginOrRegisterPage(req, res)
      } else {
        req.user = SessionManager.getSessionUser(req.session)
        req.logger?.addFields({ userId: req.user._id })
        return next()
      }
    }

    return doRequest
  },

  /**
   * @param {string} scope
   * @return {import('express').Handler}
   */
  requireOauth(scope) {
    if (typeof scope !== 'string' || !scope) {
      throw new Error(
        "requireOauth() expects a non-empty string as 'scope' parameter"
      )
    }

    const middleware = async (req, res, next) => {
      const Oauth2Server = (
        await import('../../../../modules/oauth2-server/app/src/Oauth2Server.mjs')
      ).default

      const request = new Oauth2Server.Request(req)
      const response = new Oauth2Server.Response(res)
      try {
        const token = await Oauth2Server.server.authenticate(
          request,
          response,
          { scope }
        )
        req.oauth = { access_token: token.accessToken }
        req.oauth_token = token
        req.oauth_user = token.user
        next()
      } catch (err) {
        if (
          err.code === 400 &&
          err.message === 'Invalid request: malformed authorization header'
        ) {
          err.code = 401
          err.overleafErrorCode = 'token_malformed'
        }
        // send all other errors
        res.status(err.code).json({
          error: err.name,
          error_description: err.message,
          error_code: _classifyOauthError(err),
        })
      }
    }
    return expressify(middleware)
  },

  _globalLoginWhitelist: [],
  addEndpointToLoginWhitelist(endpoint) {
    return AuthenticationController._globalLoginWhitelist.push(endpoint)
  },

  requireGlobalLogin(req, res, next) {
    if (
      AuthenticationController._globalLoginWhitelist.includes(
        req._parsedUrl.pathname
      )
    ) {
      return next()
    }

    if (req.headers.authorization != null) {
      AuthenticationController.requirePrivateApiAuth()(req, res, next)
    } else if (SessionManager.isUserLoggedIn(req.session)) {
      next()
    } else {
      logger.debug(
        { url: req.url },
        'user trying to access endpoint not in global whitelist'
      )
      if (acceptsJson(req)) return send401WithChallenge(res)
      AuthenticationController.setRedirectInSession(req)
      res.redirect('/login')
    }
  },

  checkCredentials,

  requireBasicAuth: function (userDetails) {
    const userDetailsMap = new Map(Object.entries(userDetails))
    return function (req, res, next) {
      const credentials = basicAuth(req)
      if (
        !credentials ||
        !checkCredentials(userDetailsMap, credentials.name, credentials.pass)
      ) {
        send401WithChallenge(res)
        Metrics.inc('security.http-auth', 1, { status: 'reject' })
      } else {
        Metrics.inc('security.http-auth', 1, { status: 'accept' })
        next()
      }
    }
  },

  requirePrivateApiAuth() {
    return AuthenticationController.requireBasicAuth(Settings.httpAuthUsers)
  },

  setAuditInfo(req, info) {
    if (!req.__authAuditInfo) {
      req.__authAuditInfo = {}
    }
    Object.assign(req.__authAuditInfo, info)
  },

  getAuditInfo(req) {
    return req.__authAuditInfo || {}
  },

  setRedirectInSession(req, value) {
    if (value == null) {
      // the full query string is re-encoded into the post-login redirect
      // path verbatim, never read by name here (case 1: verbatim forwarding)
      const { query } = getRawReqInput(req)
      value =
        Object.keys(query).length > 0
          ? `${req.path}?${querystring.stringify(query)}`
          : `${req.path}`
    }
    if (
      req.session != null &&
      !/^\/(socket.io|js|stylesheets|img)\/.*$/.test(value) &&
      !/^.*\.(png|jpeg|svg)$/.test(value)
    ) {
      const safePath = UrlHelper.getSafeRedirectPath(value)
      return (req.session.postLoginRedirect = safePath)
    }
  },

  _redirectToLoginOrRegisterPage(req, res) {
    return AuthenticationController._redirectToLoginPage(req, res)
  },

  _redirectToLoginPage(req, res) {
    logger.debug(
      { url: req.url },
      'user not logged in so redirecting to login page'
    )
    AuthenticationController.setRedirectInSession(req)
    // the full query string is re-encoded into the login redirect URL
    // verbatim, never read by name here (case 1: verbatim forwarding)
    const url = `/login?${querystring.stringify(getRawReqInput(req).query)}`
    res.redirect(url)
    Metrics.inc('security.login-redirect')
  },

  _recordSuccessfulLogin(userId, callback) {
    if (callback == null) {
      callback = function () {}
    }
    UserUpdater.updateUser(
      userId.toString(),
      {
        $set: { lastLoggedIn: new Date() },
        $inc: { loginCount: 1 },
      },
      function (error) {
        if (error != null) {
          callback(error)
        }
        Metrics.inc('user.login.success')
        callback()
      }
    )
  },

  _recordFailedLogin(callback) {
    Metrics.inc('user.login.failed')
    if (callback) callback()
  },

  getRedirectFromSession(req) {
    let safePath
    const value = _.get(req, ['session', 'postLoginRedirect'])
    if (value) {
      safePath = UrlHelper.getSafeRedirectPath(value)
    }
    return safePath || null
  },

  _clearRedirectFromSession(req) {
    if (req.session != null) {
      delete req.session.postLoginRedirect
    }
  },
}

function _afterLoginSessionSetup(req, user, callback) {
  req.login(user, { keepSessionInfo: true }, function (err) {
    if (err) {
      OError.tag(err, 'error from req.login', {
        user_id: user._id,
      })
      return callback(err)
    }
    delete req.session.__tmp
    delete req.session.csrfSecret

    // Populate the analyticsId cache in the session AFTER switching it into logged-in mode.
    req.session.analyticsId = user.analyticsId

    req.session.save(function (err) {
      if (err) {
        OError.tag(err, 'error saving regenerated session after login', {
          user_id: user._id,
        })
        return callback(err)
      }
      UserSessionsManager.trackSession(user, req.sessionID, function () {})
      if (!req.deviceHistory) {
        // Captcha disabled or SSO-based login.
        return callback()
      }
      req.deviceHistory.add(user.username)
      req.deviceHistory
        .serialize(req.res)
        .catch(err => {
          logger.err({ err }, 'cannot serialize deviceHistory')
        })
        .finally(() => callback())
    })
  })
}

const _afterLoginSessionSetupAsync = promisify(_afterLoginSessionSetup)

function _loginAsyncHandlers(req, user, anonymousAnalyticsId, isNewUser) {
  SplitTestHandler.promises.userMaintenanceOnLogin(user).catch(err => {
    const userId = user._id
    logger.warn({ err, userId }, 'error cleaning up split-tests on login')
  })
  LoginRateLimiter.recordSuccessfulLogin(user.username, () => {})
  AuthenticationController._recordSuccessfulLogin(user._id, () => {})
  AuthenticationController.ipMatchCheck(req, user)
  Analytics.recordEventForMongoUserInBackground(user, 'user-logged-in', {
    source: req.session.saml
      ? 'saml'
      : req.user_info?.auth_provider || 'username-password',
  })
  Analytics.identifyUser(
    user._id,
    anonymousAnalyticsId,
    isNewUser,
    Boolean(user.labsProgram)
  )

  logger.debug(
    { username: user.username, userId: user._id.toString() },
    'successful log in'
  )

  req.session.justLoggedIn = true
  // capture the request ip for use when creating the session
  return (user._login_req_ip = req.ip)
}

AuthenticationController.promises = {
  finishLogin: AuthenticationController._finishLoginAsync,
}

export default AuthenticationController
