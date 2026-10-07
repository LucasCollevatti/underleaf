import _ from 'lodash'
import Settings from '@overleaf/settings'

const supportModuleAvailable =
  Settings.moduleImportSequence?.includes('support')

const symbolPaletteModuleAvailable =
  Settings.moduleImportSequence?.includes('symbol-palette')

const trackChangesModuleAvailable =
  Settings.moduleImportSequence?.includes('track-changes')

/**
 * @typedef {Object} Settings
 * @property {Object | undefined}  apis
 * @property {Object | undefined}  apis.linkedUrlProxy
 * @property {string | undefined}  apis.linkedUrlProxy.url
 * @property {boolean | undefined} enableGithubSync
 * @property {boolean | undefined} enableGitBridge
 * @property {boolean | undefined} enableHomepage
 * @property {Object | undefined} overleaf
 * @property {Object | undefined} overleaf.oauth
 */

const Features = {
  /**
   * @returns {boolean}
   */
  externalAuthenticationSystemUsed() {
    return !Settings.underleaf && Boolean(Settings.overleaf)
  },

  /**
   * Whether a feature is enabled in the appliation's configuration
   *
   * @param {string} feature
   * @returns {boolean}
   */
  hasFeature(feature) {
    switch (feature) {
      case 'saas':
        return !Settings.underleaf && Boolean(Settings.overleaf)
      case 'homepage':
        return Boolean(Settings.enableHomepage)
      case 'registration-page':
        if (Settings.underleaf) return false
        return (
          !Features.externalAuthenticationSystemUsed() ||
          Boolean(Settings.overleaf)
        )
      case 'registration':
        return !Settings.underleaf && Boolean(Settings.overleaf)
      case 'chat':
        return Boolean(Settings.disableChat) === false
      case 'link-sharing':
        return Boolean(Settings.disableLinkSharing) === false
      case 'github-sync':
        return Boolean(Settings.enableGithubSync)
      case 'git-bridge':
        return !Settings.underleaf && Boolean(Settings.enableGitBridge)
      case 'oauth':
        return false
      case 'templates-server-pro':
        return Boolean(Settings.templates?.user_id)
      case 'affiliations':
      case 'analytics':
        return Boolean(_.get(Settings, ['apis', 'v1', 'url']))
      case 'saml':
        return false
      case 'linked-project-file':
        return Boolean(Settings.enabledLinkedFileTypes.includes('project_file'))
      case 'linked-project-output-file':
        return Boolean(
          Settings.enabledLinkedFileTypes.includes('project_output_file')
        )
      case 'link-url':
        return Boolean(
          _.get(Settings, ['apis', 'linkedUrlProxy', 'url']) &&
          Settings.enabledLinkedFileTypes.includes('url')
        )
      case 'support':
        return supportModuleAvailable
      case 'symbol-palette':
        return symbolPaletteModuleAvailable
      case 'track-changes':
        return trackChangesModuleAvailable
      default:
        throw new Error(`unknown feature: ${feature}`)
    }
  },
}

export default Features
