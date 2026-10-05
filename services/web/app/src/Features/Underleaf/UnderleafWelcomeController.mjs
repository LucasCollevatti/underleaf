import UnderleafInstallationManager from './UnderleafInstallationManager.mjs'
import { UnderleafUserError } from './UnderleafUserManager.mjs'
import AuthenticationController from '../Authentication/AuthenticationController.mjs'
import SessionManager from '../Authentication/SessionManager.mjs'
import { parseReq, z } from '../../infrastructure/Validation.mjs'

const setupSchema = z.object({
  body: z
    .object({
      username: z.string().trim().min(3).max(32),
      displayName: z.string().trim().max(255).optional(),
      password: z.string().min(1).max(72),
      confirmPassword: z.string().min(1).max(72),
    })
    .strict(),
})

async function welcome(req, res, next) {
  try {
    res.set('Cache-Control', 'no-store')
    const { initialized } = await UnderleafInstallationManager.getState()
    if (initialized) {
      return res.redirect(
        SessionManager.isUserLoggedIn(req.session) ? '/project' : '/login'
      )
    }
    res.render('underleaf/auth', {
      title: 'underleaf_welcome',
      authPage: 'welcome',
      metadata: { robotsNoindexNofollow: true },
    })
  } catch (error) {
    next(error)
  }
}

async function initialize(req, res, next) {
  let user
  try {
    const { body } = parseReq(req, setupSchema)
    if (body.password !== body.confirmPassword) {
      return res.status(400).json({ code: 'password_mismatch' })
    }
    user = await UnderleafInstallationManager.initialize({
      username: body.username,
      displayName: body.displayName,
      password: body.password,
    })
  } catch (error) {
    if (error instanceof UnderleafUserError) {
      return res
        .status(error.code === 'setup_closed' ? 409 : 400)
        .json({ code: error.code })
    }
    return next(error)
  }

  // User/state commit before any session effects. A login failure must never
  // reopen bootstrap or create another administrator on retry.
  try {
    AuthenticationController._clearRedirectFromSession(req)
    AuthenticationController.setAuditInfo(req, {
      method: 'First administrator setup',
    })
    await AuthenticationController.promises.finishLogin(user, req, res)
  } catch (error) {
    // The account already exists; the UI offers normal login for recovery.
    if (!res.headersSent) res.status(503).json({ code: 'setup_login_failed' })
    else next(error)
  }
}

async function requireInitialized(req, res, next) {
  try {
    const { initialized } = await UnderleafInstallationManager.getState()
    if (initialized) return next()
    if (req.method === 'GET' || req.method === 'HEAD')
      return res.redirect('/welcome')
    res.status(409).json({ code: 'installation_not_initialized' })
  } catch (error) {
    next(error)
  }
}

export default { welcome, initialize, requireInitialized }
