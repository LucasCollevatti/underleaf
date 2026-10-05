import { renderInReactLayout } from '@/react'
import '@/utils/meta'
import '@/utils/webpack-public-path'
import '@/infrastructure/error-reporter'
import '@/i18n'
import SettingsPageRoot from '@/features/settings/components/root'
renderInReactLayout('settings-page-root', () => <SettingsPageRoot />)
