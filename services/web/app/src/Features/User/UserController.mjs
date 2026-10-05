import Settings from '@overleaf/settings'
import UserDeleter from './UserDeleter.mjs'
import UserGetter from './UserGetter.mjs'
import { User } from '../../models/User.mjs'
import logger from '@overleaf/logger'
import metrics from '@overleaf/metrics'
import AuthenticationManager from '../Authentication/AuthenticationManager.mjs'
import SessionManager from '../Authentication/SessionManager.mjs'
import Features from '../../infrastructure/Features.mjs'
import { z, zz, parseReq } from '../../infrastructure/Validation.mjs'
import UserAuditLogHandler from './UserAuditLogHandler.mjs'
import UserSessionsManager from './UserSessionsManager.mjs'
import UserUpdater from './UserUpdater.mjs'
import Errors from '../Errors/Errors.js'
import HttpErrorHandler from '../Errors/HttpErrorHandler.mjs'
import OError from '@overleaf/o-error'
import EmailHandler from '../Email/EmailHandler.mjs'
import UrlHelper from '../Helpers/UrlHelper.mjs'
import { promisify } from 'node:util'
import { expressify } from '@overleaf/promise-utils'
import { sanitizeControlCharacters } from '../../infrastructure/Sanitize.mjs'
import { acceptsJson } from '../../infrastructure/RequestContentTypeDetection.mjs'
import Modules from '../../infrastructure/Modules.mjs'
import OneTimeTokenHandler from '../Security/OneTimeTokenHandler.mjs'

async function _sendSecurityAlertClearedSessions(user) {
  if (Settings.underleaf) return
  const emailOptions = {
    to: user.email,
    actionDescribed: `active sessions were cleared on your account ${user.email}`,
    action: 'active sessions cleared',
  }
  try {
    await EmailHandler.promises.sendEmail('securityAlert', emailOptions)
  } catch (error) {
    // log error when sending security alert email but do not pass back
    logger.error(
      { error, userId: user._id },
      'could not send security alert email when sessions cleared'
    )
  }
}

function _sendSecurityAlertPasswordChanged(user) {
  if (Settings.underleaf) return
  const emailOptions = {
    to: user.email,
    actionDescribed: `your password has been changed on your account ${user.email}`,
    action: 'password changed',
  }
  EmailHandler.promises
    .sendEmail('securityAlert', emailOptions)
    .catch(error => {
      // log error when sending security alert email but do not pass back
      logger.error(
        { error, userId: user._id },
        'could not send security alert email when password changed'
      )
    })
}

async function _ensureAffiliation(userId, emailData) {
  if (emailData.samlProviderId) {
    await UserUpdater.promises.confirmEmail(userId, emailData.email)
  } else {
    await UserUpdater.promises.addAffiliationForNewUser(userId, emailData.email)
  }
}

const changePasswordSchema = z.object({
  body: z.strictObject({
    currentPassword: z.string(),
    newPassword1: z.string(),
    newPassword2: z.string(),
  }),
})

async function changePassword(req, res, next) {
  metrics.inc('user.password-change')
  const { body } = parseReq(req, changePasswordSchema)
  const userId = SessionManager.getLoggedInUserId(req.session)

  const { user } = await AuthenticationManager.promises.authenticate(
    { _id: userId },
    body.currentPassword,
    null,
    { enforceHIBPCheck: false }
  )
  if (!user) {
    return HttpErrorHandler.badRequest(
      req,
      res,
      req.i18n.translate('password_change_old_password_wrong')
    )
  }

  if (body.newPassword1 !== body.newPassword2) {
    return HttpErrorHandler.badRequest(
      req,
      res,
      req.i18n.translate('password_change_passwords_do_not_match')
    )
  }

  try {
    await AuthenticationManager.promises.setUserPassword(
      user,
      body.newPassword1
    )
  } catch (error) {
    if (error.name === 'InvalidPasswordError') {
      const message = AuthenticationManager.getMessageForInvalidPasswordError(
        error,
        req
      )
      return res.status(400).json({ message })
    } else if (error.name === 'PasswordMustBeDifferentError') {
      return HttpErrorHandler.badRequest(
        req,
        res,
        req.i18n.translate('password_change_password_must_be_different')
      )
    } else if (error.name === 'PasswordReusedError') {
      return res.status(400).json({
        message: {
          key: 'password-must-be-strong',
        },
      })
    } else {
      throw error
    }
  }
  await UserAuditLogHandler.promises.addEntry(
    user._id,
    'update-password',
    user._id,
    req.ip
  )

  SessionManager.setInSessionUser(req.session, {
    identityVersion: user.identityVersion + 1,
  })
  // no need to wait, errors are logged and not passed back
  _sendSecurityAlertPasswordChanged(user)

  await UserSessionsManager.promises.removeSessionsFromRedis(
    user,
    req.sessionID // remove all sessions except the current session
  )

  await OneTimeTokenHandler.promises.expireAllTokensForUser(
    userId.toString(),
    'password'
  )

  return res.json({
    message: {
      type: 'success',
      username: user.username,
      text: req.i18n.translate('password_change_successful'),
    },
  })
}

async function clearSessions(req, res, next) {
  metrics.inc('user.clear-sessions')
  const userId = SessionManager.getLoggedInUserId(req.session)
  const user = await UserGetter.promises.getUser(userId, { username: 1 })
  const sessions = await UserSessionsManager.promises.getAllUserSessions(user, [
    req.sessionID,
  ])
  await UserAuditLogHandler.promises.addEntry(
    user._id,
    'clear-sessions',
    user._id,
    req.ip,
    { sessions }
  )
  await UserSessionsManager.promises.removeSessionsFromRedis(
    user,
    req.sessionID // remove all sessions except the current session
  )

  await _sendSecurityAlertClearedSessions(user)

  res.sendStatus(201)
}

async function ensureAffiliation(user) {
  if (!Features.hasFeature('affiliations')) {
    return
  }

  const flaggedEmails = user.emails.filter(email => email.affiliationUnchecked)
  if (flaggedEmails.length === 0) {
    return
  }

  if (flaggedEmails.length > 1) {
    logger.error(
      { userId: user._id },
      `Unexpected number of flagged emails: ${flaggedEmails.length}`
    )
  }

  await _ensureAffiliation(user._id, flaggedEmails[0])
}

const ensureAffiliationMiddlewareSchema = z.object({
  query: z.object({
    // just a truthiness flag on whether to run the affiliation check; the
    // real caller sends the query string `?ensureAffiliation=true`
    ensureAffiliation: z.coerce.boolean().optional(),
  }),
})

async function ensureAffiliationMiddleware(req, res, next) {
  let user
  const { query } = parseReq(req, ensureAffiliationMiddlewareSchema, {
    logOnly: true,
  })
  if (!Features.hasFeature('affiliations') || !query.ensureAffiliation) {
    return next()
  }
  const userId = SessionManager.getLoggedInUserId(req.session)
  try {
    user = await UserGetter.promises.getUser(userId)
  } catch (error) {
    throw new Errors.UserNotFoundError({ info: { userId } })
  }
  // if the user does not have permission to add an affiliation, we skip this middleware
  try {
    req.assertPermission('add-affiliation')
  } catch (error) {
    if (error instanceof Errors.ForbiddenError) {
      return next()
    }
  }
  await ensureAffiliation(user)
  return next()
}

const tryDeleteUserSchema = z.object({
  body: z.strictObject({
    password: z.string().optional(),
  }),
})

async function tryDeleteUser(req, res, next) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  const { password } = parseReq(req, tryDeleteUserSchema, {
    logOnly: true,
  }).body
  req.logger.addFields({ userId })

  logger.debug({ userId }, 'trying to delete user account')
  if (password == null || password === '') {
    logger.err({ userId }, 'no password supplied for attempt to delete account')
    return res.sendStatus(403)
  }

  let user
  try {
    user = (
      await AuthenticationManager.promises.authenticate(
        { _id: userId },
        password,
        null,
        { enforceHIBPCheck: false }
      )
    ).user
  } catch (err) {
    throw OError.tag(
      err,
      'error authenticating during attempt to delete account',
      { userId }
    )
  }

  if (!user) {
    logger.err({ userId }, 'auth failed during attempt to delete account')
    return res.sendStatus(403)
  }

  try {
    await UserDeleter.promises.deleteUser(userId, {
      deleterUser: user,
      ipAddress: req.ip,
    })
  } catch (err) {
    const errorData = {
      message: 'error while deleting user account',
      info: { userId },
    }
    if (err instanceof Errors.SubscriptionAdminDeletionError) {
      // set info.public.error for JSON response so frontend can display
      // a specific message
      errorData.info.public = {
        error: 'SubscriptionAdminDeletionError',
      }
      const error = OError.tag(err, errorData.message, errorData.info)
      logger.warn({ error, req }, error.message)
      return HttpErrorHandler.unprocessableEntity(
        req,
        res,
        errorData.message,
        errorData.info.public
      )
    } else {
      throw OError.tag(err, errorData.message, errorData.info)
    }
  }

  await Modules.promises.hooks.fire('tryDeleteV1Account', user)

  const sessionId = req.sessionID

  if (typeof req.logout === 'function') {
    const logout = promisify(req.logout)
    await logout()
  }

  const destroySession = promisify(req.session.destroy.bind(req.session))
  await destroySession()

  UserSessionsManager.promises.untrackSession(user, sessionId).catch(err => {
    logger.warn({ err, userId: user._id }, 'failed to untrack session')
  })
  // Note that the "*" must be in double quotes
  // https://www.w3.org/TR/clear-site-data/#ref-for-grammardef-
  res.set('Clear-Site-Data', '"*"')
  res.sendStatus(200)
}

async function subscribe(req, res, next) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  req.logger.addFields({ userId })

  await Modules.promises.hooks.fire(
    'updateTopicSubscription',
    userId,
    'newsletter',
    true
  )

  res.json({
    message: req.i18n.translate('thanks_settings_updated'),
    subscribed: true,
  })
}

async function unsubscribe(req, res, next) {
  const userId = SessionManager.getLoggedInUserId(req.session)
  req.logger.addFields({ userId })

  await Modules.promises.hooks.fire(
    'updateTopicSubscription',
    userId,
    'newsletter',
    false
  )

  res.json({
    message: req.i18n.translate('thanks_settings_updated'),
    subscribed: false,
  })
}

const refProviderSettingsSchema = z
  .strictObject({
    enabled: z.boolean().optional(),
    groups: z.array(z.object({ id: z.string() })).optional(),
    disablePersonalLibrary: z.boolean().optional(),
  })
  .optional()

const updateUserSettingsSchema = z.object({
  // the frontend posts one changed setting at a time (`{[key]: value}`), so
  // every field here is optional
  body: z.strictObject({
    institution: z.string().optional(),
    displayName: z.string().trim().min(1).max(255).optional(),
    mode: z.string().optional(),
    editorTheme: z.string().optional(),
    editorLightTheme: z.string().optional(),
    editorDarkTheme: z.string().optional(),
    overallTheme: z.string().optional(),
    fontSize: z.number().optional(),
    autoComplete: z.boolean().optional(),
    autoPairDelimiters: z.boolean().optional(),
    spellCheckLanguage: z.string().optional(),
    pdfViewer: z.string().optional(),
    syntaxValidation: z.boolean().optional(),
    // these six settings are cast with `Boolean(...)` below rather than
    // checked for a strict boolean, so any truthy/falsy value is accepted
    // here too
    previewTabs: z.coerce.boolean().optional(),
    fontFamily: z.string().optional(),
    lineHeight: z.string().optional(),
    mathPreview: z.boolean().optional(),
    breadcrumbs: z.coerce.boolean().optional(),
    editorTabs: z.coerce.boolean().optional(),
    nonBlinkingCursor: z.coerce.boolean().optional(),
    referencesSearchMode: z.string().optional(),
    darkModePdf: z.coerce.boolean().optional(),
    floatingMenu: z.coerce.boolean().optional(),
    zotero: refProviderSettingsSchema,
    mendeley: refProviderSettingsSchema,
    papers: refProviderSettingsSchema,
  }),
})

async function updateUserSettings(req, res, next) {
  const { body } = parseReq(req, updateUserSettingsSchema)
  const userId = SessionManager.getLoggedInUserId(req.session)
  req.logger.addFields({ userId })

  const user = await User.findById(userId).exec()
  if (user == null) {
    throw new OError('problem updating user settings', { userId })
  }

  if (typeof body.displayName === 'string') {
    user.displayName = sanitizeControlCharacters(body.displayName).trim()
    user.first_name = user.displayName
    user.last_name = ''
  }
  if (typeof body.institution === 'string') {
    user.institution = sanitizeControlCharacters(body.institution).trim()
  }
  if (body.mode != null) {
    user.ace.mode = body.mode
  }
  if (body.editorTheme != null) {
    user.ace.theme = body.editorTheme
  }
  if (body.editorLightTheme != null) {
    user.ace.lightTheme = body.editorLightTheme
  }
  if (body.editorDarkTheme != null) {
    user.ace.darkTheme = body.editorDarkTheme
  }
  if (body.overallTheme != null) {
    user.ace.overallTheme = body.overallTheme
  }
  if (body.fontSize != null) {
    user.ace.fontSize = body.fontSize
  }
  if (body.autoComplete != null) {
    user.ace.autoComplete = body.autoComplete
  }
  if (body.autoPairDelimiters != null) {
    user.ace.autoPairDelimiters = body.autoPairDelimiters
  }
  if (body.spellCheckLanguage != null) {
    user.ace.spellCheckLanguage = body.spellCheckLanguage
  }
  if (body.pdfViewer != null) {
    user.ace.pdfViewer = body.pdfViewer
  }
  if (body.syntaxValidation != null) {
    user.ace.syntaxValidation = body.syntaxValidation
  }
  if (body.previewTabs != null) {
    user.ace.previewTabs = Boolean(body.previewTabs)
  }
  if (body.fontFamily != null) {
    user.ace.fontFamily = body.fontFamily
  }
  if (body.lineHeight != null) {
    user.ace.lineHeight = body.lineHeight
  }
  if (body.mathPreview != null) {
    user.ace.mathPreview = body.mathPreview
  }
  if (body.breadcrumbs != null) {
    user.ace.breadcrumbs = Boolean(body.breadcrumbs)
  }
  if (body.editorTabs != null) {
    user.ace.editorTabs = Boolean(body.editorTabs)
  }
  if (body.nonBlinkingCursor != null) {
    user.ace.nonBlinkingCursor = Boolean(body.nonBlinkingCursor)
  }
  if (body.referencesSearchMode != null) {
    const mode = body.referencesSearchMode === 'simple' ? 'simple' : 'advanced'
    user.ace.referencesSearchMode = mode
  }
  if (body.darkModePdf != null) {
    user.ace.darkModePdf = Boolean(body.darkModePdf)
  }
  if (body.floatingMenu != null) {
    user.ace.floatingMenu = Boolean(body.floatingMenu)
  }
  if (body.zotero != null) {
    user.ace.zotero = { ...user.ace.zotero, ...body.zotero }
  }
  if (body.mendeley != null) {
    user.ace.mendeley = { ...user.ace.mendeley, ...body.mendeley }
  }
  if (body.papers != null) {
    user.ace.papers = { ...user.ace.papers, ...body.papers }
  }
  user.updatedAt = new Date()
  await user.save()

  SessionManager.setInSessionUser(req.session, {
    displayName: user.displayName,
    first_name: user.first_name,
    last_name: user.last_name,
  })
  return res.sendStatus(200)
}

async function doLogout(req) {
  metrics.inc('user.logout')
  const user = SessionManager.getSessionUser(req.session)
  logger.debug({ user }, 'logging out')
  const sessionId = req.sessionID

  if (user != null) {
    UserAuditLogHandler.addEntryInBackground(
      user._id,
      'logout',
      user._id,
      req.ip,
      {}
    )
  }

  if (typeof req.logout === 'function') {
    // passport logout
    const logout = promisify(req.logout.bind(req))
    await logout()
  }

  const destroySession = promisify(req.session.destroy.bind(req.session))
  await destroySession()

  if (user != null) {
    UserSessionsManager.promises.untrackSession(user, sessionId).catch(err => {
      logger.warn({ err, userId: user._id }, 'failed to untrack session')
    })
  }
}

const logoutSchema = z.object({
  body: z.strictObject({
    redirect: z.string().optional(),
  }),
})

async function logout(req, res, next) {
  const { body } = parseReq(req, logoutSchema, { logOnly: true })
  const requestedRedirect = body.redirect
    ? UrlHelper.getSafeRedirectPath(body.redirect)
    : undefined
  const redirectUrl = requestedRedirect || '/login'

  await doLogout(req)

  if (acceptsJson(req)) {
    res.status(200).json({ redir: redirectUrl })
  } else {
    res.redirect(redirectUrl)
  }
}

const expireDeletedUserSchema = z.object({
  params: z.strictObject({
    userId: zz.objectId(),
  }),
})

async function expireDeletedUser(req, res, next) {
  const { params } = parseReq(req, expireDeletedUserSchema, {
    logOnly: true,
  })
  await UserDeleter.promises.expireDeletedUser(params.userId)
  res.sendStatus(204)
}

async function expireDeletedUsersAfterDuration(req, res, next) {
  await UserDeleter.promises.expireDeletedUsersAfterDuration()
  res.sendStatus(204)
}

export default {
  clearSessions: expressify(clearSessions),
  changePassword: expressify(changePassword),
  tryDeleteUser: expressify(tryDeleteUser),
  subscribe: expressify(subscribe),
  unsubscribe: expressify(unsubscribe),
  updateUserSettings: expressify(updateUserSettings),
  logout: expressify(logout),
  expireDeletedUser: expressify(expireDeletedUser),
  expireDeletedUsersAfterDuration: expressify(expireDeletedUsersAfterDuration),
  ensureAffiliationMiddleware: expressify(ensureAffiliationMiddleware),
  ensureAffiliation,
}
