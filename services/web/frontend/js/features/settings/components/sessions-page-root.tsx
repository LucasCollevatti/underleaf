import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { postJSON } from '@/infrastructure/fetch-json'
import getMeta from '@/utils/meta'
import MaterialIcon from '@/shared/components/material-icon'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import UnderleafPageSkeleton from '@/shared/components/underleaf/underleaf-page-skeleton'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'

type UserSession = {
  ip_address?: string
  session_created?: string
}

function formatSessionDate(value?: string) {
  if (!value) return ''

  const formatted = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'UTC',
  }).format(new Date(value))

  return `${formatted.replace(/\b(am|pm)\b/i, part => part.toUpperCase())} UTC`
}

function SessionsPageRoot() {
  const { isReady } = useWaitForI18n()

  return (
    <UnderleafAppProviders>
      <UnderleafAppShell
        activePage="settings"
        pageClassName="underleaf-sessions-page"
      >
        {isReady ? (
          <SessionsPageContent />
        ) : (
          <UnderleafPageSkeleton variant="sessions" />
        )}
      </UnderleafAppShell>
    </UnderleafAppProviders>
  )
}

function SessionsPageContent() {
  const { t } = useTranslation()
  const currentSession = getMeta('ol-currentSession') as UserSession
  const sessions = (getMeta('ol-sessions') || []) as UserSession[]
  const [activeSessions, setActiveSessions] = useState(sessions)
  const [isClearing, setIsClearing] = useState(false)
  const [clearError, setClearError] = useState(false)

  const clearOtherSessions = async () => {
    setIsClearing(true)
    setClearError(false)

    try {
      await postJSON('/user/sessions/clear')
      setActiveSessions([])
    } catch {
      setClearError(true)
    } finally {
      setIsClearing(false)
    }
  }

  return (
    <main id="main-content" className="underleaf-sessions-main">
      <nav className="underleaf-sessions-breadcrumb" aria-label="Breadcrumb">
        <a href="/user/settings">{t('account_settings')}</a>
        <span aria-hidden="true">/</span>
        <span>{t('sessions')}</span>
      </nav>
      <header className="underleaf-sessions-heading underleaf-page-heading">
        <h1>
          {t('underleaf_sessions_title', { defaultValue: 'Your sessions' })}
        </h1>
        <p>
          {t('underleaf_sessions_page_description', {
            defaultValue:
              "Every browser where you're signed in. Sign out of sessions you don't recognize.",
          })}
        </p>
      </header>

      <section
        className="underleaf-sessions-card"
        aria-labelledby="current-session-heading"
      >
        <div className="underleaf-sessions-card-header">
          <h2 id="current-session-heading">
            {t('underleaf_current_session', { defaultValue: 'Current session' })}
          </h2>
        </div>
        <div className="underleaf-current-session-row">
          <span className="underleaf-session-device-icon" aria-hidden="true">
            <MaterialIcon type="laptop_mac" />
          </span>
          <div className="underleaf-session-field">
            <span>{t('ip_address')}</span>
            <strong>{currentSession?.ip_address || '—'}</strong>
          </div>
          <div className="underleaf-session-field">
            <span>{t('signed_in', { defaultValue: 'Signed in' })}</span>
            <strong>{formatSessionDate(currentSession?.session_created)}</strong>
          </div>
          <span className="underleaf-session-current-badge">
            <span aria-hidden="true" />
            {t('underleaf_current_browser', { defaultValue: 'This browser' })}
          </span>
        </div>
      </section>

      <section
        className="underleaf-sessions-card"
        aria-labelledby="other-sessions-heading"
      >
        <div className="underleaf-sessions-card-header">
          <h2 id="other-sessions-heading">
            {t('underleaf_other_sessions', { defaultValue: 'Other sessions' })}
          </h2>
          <button
            type="button"
            className="underleaf-sessions-clear-button"
            disabled={activeSessions.length === 0 || isClearing}
            onClick={clearOtherSessions}
          >
            {isClearing
              ? t('processing')
              : t('underleaf_sign_out_all_others', {
                  defaultValue: 'Sign out all others',
                })}
          </button>
        </div>
        {activeSessions.length > 0 ? (
          <div className="underleaf-other-sessions-list">
            {activeSessions.map((session, index) => (
              <div
                className="underleaf-other-session-row"
                key={`${session.ip_address}-${session.session_created}-${index}`}
              >
                <MaterialIcon type="devices" />
                <div className="underleaf-session-field">
                  <span>{t('ip_address')}</span>
                  <strong>{session.ip_address || '—'}</strong>
                </div>
                <div className="underleaf-session-field">
                  <span>{t('signed_in', { defaultValue: 'Signed in' })}</span>
                  <strong>{formatSessionDate(session.session_created)}</strong>
                </div>
              </div>
            ))}
            {clearError && (
              <p className="underleaf-sessions-error" role="alert">
                {t('generic_error', {
                  defaultValue: 'Something went wrong. Please try again.',
                })}
              </p>
            )}
          </div>
        ) : (
          <div className="underleaf-sessions-empty-state">
            <MaterialIcon type="verified_user" />
            <strong>
              {t('underleaf_no_other_sessions', {
                defaultValue: 'No other active sessions',
              })}
            </strong>
            <span>
              {t('underleaf_only_signed_in_here', {
                defaultValue: "You're only signed in here.",
              })}
            </span>
          </div>
        )}
      </section>
    </main>
  )
}

export default SessionsPageRoot
