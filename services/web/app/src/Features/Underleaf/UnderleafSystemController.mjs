import Settings from '@overleaf/settings'
import { expressify } from '@overleaf/promise-utils'
import SessionManager from '../Authentication/SessionManager.mjs'
import UserGetter from '../User/UserGetter.mjs'
import UserSettingsHelper from '../Project/UserSettingsHelper.mjs'
import { renderSystemPage } from './UnderleafSystemPage.mjs'

async function appearance(req, res) {
  const user = await UserGetter.promises.getUser(
    SessionManager.getLoggedInUserId(req.session)
  )
  const userSettings = await UserSettingsHelper.buildUserSettings(req, res, {
    ...user,
    ace: user?.ace || {},
  })
  return {
    userSettings,
    initialTheme: UserSettingsHelper.getInitialTheme(userSettings.overallTheme),
  }
}

export default {
  status: expressify(async (req, res) => {
    const preferences = await appearance(req, res)
    if (Settings.shuttingDown) res.status(503)
    renderSystemPage(
      req,
      res,
      {
        kind: 'status',
        title: req.i18n.translate('underleaf_application_status'),
        description: req.i18n.translate('underleaf_status_description'),
        status: {
          checkedAt: new Date().toISOString(),
          uptimeSeconds: Math.floor(process.uptime()),
          shuttingDown: Boolean(Settings.shuttingDown),
          siteOpen: Boolean(Settings.siteIsOpen),
          editorOpen: Boolean(Settings.editorIsOpen),
        },
      },
      preferences
    )
  }),
  logout: expressify(async (req, res) => {
    const preferences = await appearance(req, res)
    renderSystemPage(
      req,
      res,
      {
        kind: 'logout',
        title: req.i18n.translate('underleaf_log_out_title'),
        description: req.i18n.translate('underleaf_log_out_description'),
      },
      preferences
    )
  }),
}
