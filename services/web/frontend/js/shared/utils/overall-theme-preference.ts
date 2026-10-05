import localStorage from '@/infrastructure/local-storage'
import { type OverallTheme } from './styles'

const BROWSER_THEME_KEY = 'underleaf.overallTheme'

export function readBrowserOverallTheme(): OverallTheme | undefined {
  const value = localStorage.getItem(BROWSER_THEME_KEY)
  return value === '' || value === 'light-' || value === 'system'
    ? value
    : undefined
}

export function writeBrowserOverallTheme(theme: OverallTheme) {
  localStorage.setItem(BROWSER_THEME_KEY, theme)
}
