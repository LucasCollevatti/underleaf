import { useTranslation } from 'react-i18next'

function SessionsSection() {
  const { t } = useTranslation()

  return (
    <>
      <h3>{t('sessions')}</h3>
      <p className="underleaf-settings-card-description">
        {t('underleaf_sessions_description', {
          defaultValue: 'Browsers currently signed in to your account.',
        })}
      </p>
      <a
        className="underleaf-session-item"
        href="/user/sessions"
        aria-label={t('manage_sessions')}
      >
        <span className="underleaf-session-item-icon" aria-hidden="true">
          <span className="material-symbols">devices</span>
        </span>
        <div className="underleaf-session-item-details">
          <strong>
            {t('underleaf_active_session', {
              defaultValue: '1 active session',
            })}
          </strong>
          <span>
            {t('underleaf_current_browser', {
              defaultValue: 'This browser',
            })}
          </span>
        </div>
        <span className="underleaf-session-item-action">
          {t('manage_sessions')}
          <span aria-hidden="true"> →</span>
        </span>
      </a>
    </>
  )
}

export default SessionsSection
