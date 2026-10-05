import { useCallback } from 'react'
import { saveUserSettings } from '../utils/api'
import { UserSettings } from '../../../../../types/user-settings'
import { useUserSettingsContext } from '@/shared/context/user-settings-context'
import getMeta from '@/utils/meta'
import { writeBrowserOverallTheme } from '@/shared/utils/overall-theme-preference'

export default function useSetOverallTheme() {
  const { userSettings, setUserSettings } = useUserSettingsContext()
  const { overallTheme } = userSettings

  const setOverallTheme = useCallback(
    (overallTheme: UserSettings['overallTheme']) => {
      setUserSettings(settings => ({ ...settings, overallTheme }))
    },
    [setUserSettings]
  )

  return useCallback(
    (newOverallTheme: UserSettings['overallTheme']) => {
      if (overallTheme !== newOverallTheme) {
        const chosenTheme = (
          getMeta('ol-overallThemes') ?? [
            { val: 'system' },
            { val: 'light-' },
            { val: '' },
          ]
        ).some(theme => theme.val === newOverallTheme)

        if (chosenTheme) {
          setOverallTheme(newOverallTheme)
          writeBrowserOverallTheme(newOverallTheme)
          if (getMeta('ol-user_id') || getMeta('ol-navbar')?.sessionUser) {
            saveUserSettings('overallTheme', newOverallTheme)
          }
        }
      }
    },
    [overallTheme, setOverallTheme]
  )
}
