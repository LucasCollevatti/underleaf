import { useTranslation } from 'react-i18next'
import AccountInfoSection from './account-info-section'
import PasswordSection from './password-section'
import SessionsSection from './sessions-section'
import { UserProvider } from '../../../shared/context/user-context'
import useWaitForI18n from '../../../shared/hooks/use-wait-for-i18n'
import useScrollToIdOnLoad from '../../../shared/hooks/use-scroll-to-id-on-load'
import ThemeToggle from '@/shared/components/sidebar/theme-toggle'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'

function SettingsPageRoot() {
  const { isReady } = useWaitForI18n()
  useScrollToIdOnLoad()

  return (
    <UnderleafAppProviders>
      <UnderleafAppShell activePage="settings">
        <UserProvider>{isReady && <SettingsPageContent />}</UserProvider>
      </UnderleafAppShell>
    </UnderleafAppProviders>
  )
}

function SettingsPageContent() {
  const { t } = useTranslation()
  return (
    <main id="main-content" className="container p-4">
      <h1>{t('account_settings')}</h1>
      <div className="row g-4 mt-2">
        <section className="col-lg-6" aria-labelledby="update-account-info">
          <AccountInfoSection />
        </section>
        <section className="col-lg-6" aria-label={t('change_password')}>
          <PasswordSection />
        </section>
      </div>
      <hr />
      <section aria-labelledby="appearance-heading">
        <h2 id="appearance-heading">Appearance</h2>
        <ThemeToggle />
      </section>
      <hr />
      <section aria-label={t('sessions')}>
        <SessionsSection />
      </section>
    </main>
  )
}

export default SettingsPageRoot
