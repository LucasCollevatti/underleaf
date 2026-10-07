import { useId } from 'react'
import useSetOverallTheme from '@/features/ide-settings/hooks/use-set-overall-theme'
import MaterialIcon from '@/shared/components/material-icon'
import OLTooltip from '@/shared/components/ol/ol-tooltip'
import { useUserSettingsContext } from '@/shared/context/user-settings-context'
import getMeta from '@/utils/meta'
import { OverallThemeMeta } from '@ol-types/project-settings'
import { useTranslation } from 'react-i18next'

type ThemeToggleProps = {
  variant?: 'sidebar' | 'settings'
}

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

const getThemePreviewClass = (theme: OverallThemeMeta) => {
  switch (theme.val) {
    case 'light-':
      return 'light'
    case 'system':
      return 'system'
    default:
      return 'dark'
  }
}

export default function ThemeToggle({ variant = 'sidebar' }: ThemeToggleProps) {
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
  const themes =
    variant === 'settings'
      ? [...overallThemes].sort((firstTheme, secondTheme) => {
          const order = { '': 0, 'light-': 1, system: 2 }
          return order[firstTheme.val] - order[secondTheme.val]
        })
      : overallThemes
  const id = useId()

  return (
    <fieldset className={`dropdown-item theme-toggle theme-toggle-${variant}`}>
      <legend>{t('theme')}</legend>
      {variant === 'settings' && (
        <p className="theme-toggle-description">
          {t('underleaf_theme_browser_hint', {
            defaultValue: 'Applies to this browser.',
          })}
        </p>
      )}
      <div className="theme-toggle-radios">
        {themes.map((theme) => (
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
                {variant === 'settings' ? (
                  <>
                    <span
                      className={`theme-toggle-preview theme-toggle-preview-${getThemePreviewClass(theme)}`}
                      aria-hidden="true"
                    >
                      <span className="theme-toggle-preview-line" />
                      <span className="theme-toggle-preview-dot" />
                    </span>
                    <span className="theme-toggle-label">{theme.name}</span>
                  </>
                ) : (
                  <MaterialIcon type={getIcon(theme)} />
                )}
              </label>
            </div>
          </OLTooltip>
        ))}
      </div>
    </fieldset>
  )
}
