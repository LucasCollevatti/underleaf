import { useId } from 'react'
import useSetOverallTheme from '@/features/ide-settings/hooks/use-set-overall-theme'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useUserSettingsContext } from '@/shared/context/user-settings-context'
import getMeta from '@/utils/meta'
import { OverallThemeMeta } from '@ol-types/project-settings'
import { useTranslation } from 'react-i18next'

const getIcon = (theme: OverallThemeMeta) => {
  switch (theme.val) {
    case 'light-':
      return 'light_mode'
    case 'system':
      return 'computer'
    default:
      return 'dark_mode'
  }
}

export default function ThemeToggle() {
  const {
    userSettings: { overallTheme },
  } = useUserSettingsContext()
  const setOverallTheme = useSetOverallTheme()
  const { t } = useTranslation()
  const overallThemes =
    getMeta('ol-overallThemes') ??
    ([
      { name: t('underleaf_theme_system'), val: 'system' },
      { name: t('underleaf_theme_light'), val: 'light-' },
      { name: t('underleaf_theme_dark'), val: '' },
    ] as OverallThemeMeta[])
  const id = useId()

  return (
    <fieldset className="dropdown-item theme-toggle">
      <legend>{t('theme')}</legend>
      <div className="theme-toggle-radios">
        {overallThemes.map(theme => (
          <OLTooltip
            key={theme.val}
            description={theme.name}
            id={`${id}-${theme.name}`}
          >
            <div className="theme-toggle-radio">
              <input
                id={`${id}-${theme.name}`}
                name={`${id}-theme`}
                type="radio"
                value={theme.val}
                checked={overallTheme === theme.val}
                onChange={() => setOverallTheme(theme.val)}
              />
              <label htmlFor={`${id}-${theme.name}`} aria-label={theme.name}>
                <MaterialIcon type={getIcon(theme)} />
              </label>
            </div>
          </OLTooltip>
        ))}
      </div>
    </fieldset>
  )
}
