import Settings from '@overleaf/settings'
import SessionManager from '../Authentication/SessionManager.mjs'

const errorKeys = {
  403: ['underleaf_access_denied', 'underleaf_access_denied_description'],
  404: ['underleaf_page_not_found', 'underleaf_page_not_found_description'],
  500: ['underleaf_server_error', 'underleaf_server_error_description'],
}

const fallbackText = {
  underleaf_access_denied: 'Access denied',
  underleaf_access_denied_description:
    'Your account does not have permission to open this page.',
  underleaf_page_not_found: 'Page not found',
  underleaf_page_not_found_description:
    'This page does not exist or is no longer available.',
  underleaf_server_error: 'Something went wrong',
  underleaf_server_error_description:
    'Underleaf could not complete this request. Try again, or contact your installation administrator if the problem continues.',
  underleaf_request_error: 'Request could not be completed',
  underleaf_request_error_description: 'Check your request and try again.',
  underleaf_session_expired: 'Session expired',
  underleaf_session_expired_description:
    'Your session changed or expired. Reload the page or log in again to continue.',
  underleaf_maintenance_description:
    'This Underleaf installation is undergoing maintenance. Please try again later.',
  back_to_your_projects: 'Back to your projects',
  log_in: 'Log in',
  log_out: 'Log out',
  cancel: 'Cancel',
  refresh: 'Refresh',
  projects: 'Projects',
  account_settings: 'Account settings',
  underleaf_administration: 'Administration',
  underleaf_users: 'Users',
  underleaf_system: 'System',
  maintenance: 'Maintenance',
  theme: 'Theme',
  underleaf_theme_system: 'System',
  underleaf_source_code: 'Source code',
  underleaf_origin_notice:
    'Underleaf is an independent fork of Overleaf Community Edition, not operated, supported or endorsed by Overleaf. Original copyright and license notices are preserved in the source.',
  license: 'License',
  primary: 'Main navigation',
  underleaf_theme_light: 'Light',
  underleaf_theme_dark: 'Dark',
  underleaf_status_web: 'Web service',
  underleaf_status_site: 'Website access',
  underleaf_status_editor: 'Editor access',
  underleaf_status_ready: 'Available',
  underleaf_status_closed: 'Closed',
  underleaf_status_stopping: 'Shutting down',
  underleaf_status_uptime: 'Process uptime (seconds)',
}

function translator(req, res) {
  const translate = res.locals?.translate || req.i18n?.translate?.bind(req.i18n)
  return key => {
    const value = translate?.(key)
    return value && value !== key ? value : fallbackText[key] || key
  }
}

// Error rendering deliberately performs no database or service calls.
export function renderSystemPage(req, res, page, locals = {}) {
  const user = SessionManager.getSessionUser(req.session)
  const translate = translator(req, res)
  const signedIn = Boolean(user)
  const systemPage = {
    ...page,
    signedIn,
    backPath: signedIn ? '/project' : '/login',
    backLabel: translate(signedIn ? 'back_to_your_projects' : 'log_in'),
    canAdmin: user?.role === 'admin',
  }
  res.set('Cache-Control', 'no-store')
  // CSRF/session errors can happen before localization and frontend metadata
  // middleware. Keep a minimal, database-free HTML path for those failures.
  return res.render(
    res.locals?.ExposedSettings
      ? 'underleaf/system'
      : 'underleaf/system-static',
    {
      title: page.title,
      metadata: { title: page.title, robotsNoindexNofollow: true },
      systemPage,
      initialTheme: 'system',
      translate,
      ...locals,
    }
  )
}

export function renderErrorPage(req, res, statusCode, message) {
  const translate = translator(req, res)
  const keys =
    errorKeys[statusCode] ||
    (statusCode >= 500
      ? errorKeys[500]
      : ['underleaf_request_error', 'underleaf_request_error_description'])
  return renderSystemPage(req, res, {
    kind: 'error',
    code: statusCode,
    title: translate(keys[0]),
    description: translate(keys[1]),
    // Do not expose internal server errors, stack traces or credentials.
    detail:
      statusCode < 500 &&
      statusCode !== 403 &&
      statusCode !== 404 &&
      typeof message === 'string'
        ? message
        : undefined,
  })
}

export function renderSessionExpired(req, res) {
  const translate = translator(req, res)
  return renderSystemPage(req, res, {
    kind: 'session-expired',
    title: translate('underleaf_session_expired'),
    description: translate('underleaf_session_expired_description'),
  })
}

export function renderMaintenance(req, res) {
  const translate = translator(req, res)
  return renderSystemPage(req, res, {
    kind: 'maintenance',
    title: translate('maintenance'),
    description:
      Settings.maintenanceMessage ||
      translate('underleaf_maintenance_description'),
    descriptionHtml: Settings.maintenanceMessageHTML || undefined,
  })
}
