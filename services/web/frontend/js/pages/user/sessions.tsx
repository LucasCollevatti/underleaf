import { renderInReactLayout } from '@/react'
import '@/utils/meta'
import '@/utils/webpack-public-path'
import '@/infrastructure/error-reporter'
import '@/i18n'
import SessionsPageRoot from '@/features/settings/components/sessions-page-root'

renderInReactLayout('sessions-page-root', () => <SessionsPageRoot />)
