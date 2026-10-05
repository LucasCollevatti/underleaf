import { type FormEvent, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import OLButton from '@/shared/components/ol/ol-button'
import OLForm from '@/shared/components/ol/ol-form'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormGroup from '@/shared/components/ol/ol-form-group'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import { FetchError, postJSON } from '@/infrastructure/fetch-json'

type Step = 'welcome' | 'administrator' | 'ready'
type Props = {
  page: 'welcome' | 'login'
  navigate?: (path: string) => void
}

const defaultNavigate = (path: string) => window.location.assign(path)
const steps: Step[] = ['welcome', 'administrator', 'ready']
const errorKeys: Record<string, string> = {
  invalid_username: 'underleaf_invalid_username',
  invalid_password: 'underleaf_invalid_password',
  too_short: 'underleaf_invalid_password',
  too_long: 'underleaf_invalid_password',
  invalid_character: 'underleaf_invalid_password',
  username_taken: 'underleaf_username_taken',
  password_mismatch: 'underleaf_password_mismatch',
  setup_closed: 'underleaf_setup_closed',
  setup_login_failed: 'underleaf_setup_login_failed',
}

export default function UnderleafAuthPage(props: Props) {
  return (
    <UnderleafAppProviders>
      <AuthContent {...props} />
    </UnderleafAppProviders>
  )
}

function AuthContent({ page, navigate = defaultNavigate }: Props) {
  const { t } = useTranslation()
  const [step, setStep] = useState<Step>('welcome')
  const [busy, setBusy] = useState(false)
  const inflight = useRef(false)
  const [error, setError] = useState('')
  const [offerLogin, setOfferLogin] = useState(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const setup = page === 'welcome'

  useEffect(() => {
    if (!setup) return
    headingRef.current?.focus()
    if (step === 'ready') {
      const timer = window.setTimeout(() => navigate('/project'), 1200)
      return () => window.clearTimeout(timer)
    }
  }, [setup, step, navigate])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inflight.current) return
    const fields = new FormData(event.currentTarget)
    const password = String(fields.get('password') ?? '')
    if (setup && password !== fields.get('confirmPassword')) {
      setError(t('underleaf_password_mismatch'))
      return
    }
    inflight.current = true
    setBusy(true)
    setError('')
    setOfferLogin(false)
    try {
      const body: Record<string, string> = {
        username: String(fields.get('username') ?? ''),
        password,
      }
      if (setup) {
        body.displayName = String(fields.get('displayName') ?? '')
        body.confirmPassword = String(fields.get('confirmPassword') ?? '')
      }
      const response = await postJSON<{
        redir?: string
        message?: { text?: string }
      }>(setup ? '/welcome' : '/login', { body })
      // The inherited login endpoint can return an error message with HTTP 200.
      if (!response.redir) {
        setError(response.message?.text || t('underleaf_auth_error'))
      } else if (setup) {
        setStep('ready')
      } else {
        navigate(response.redir)
      }
    } catch (cause) {
      const failure = cause instanceof FetchError ? cause : undefined
      const code = failure?.data?.code
      setOfferLogin(code === 'setup_closed' || code === 'setup_login_failed')
      const statusKey =
        failure?.response?.status === 429
          ? 'underleaf_auth_rate_limited'
          : failure?.response?.status === 403
            ? 'underleaf_auth_session_error'
            : 'underleaf_auth_error'
      setError(t(errorKeys[code] || statusKey))
    } finally {
      inflight.current = false
      setBusy(false)
    }
  }

  const navigation = setup ? (
    <div className="underleaf-setup-navigation">
      <p className="underleaf-setup-label">{t('underleaf_setup')}</p>
      <ol className="underleaf-setup-steps">
        {steps.map((item, index) => (
          <li key={item} aria-current={step === item ? 'step' : undefined}>
            <span className="underleaf-step-dot" aria-hidden="true">
              {index < steps.indexOf(step) ? '✓' : step === item ? '●' : '○'}
            </span>
            {t(`underleaf_step_${item}`)}
          </li>
        ))}
      </ol>
    </div>
  ) : undefined

  const heading = !setup
    ? 'underleaf_welcome_back'
    : step === 'welcome'
      ? 'underleaf_welcome'
      : step === 'administrator'
        ? 'underleaf_create_administrator'
        : 'underleaf_ready'

  return (
    <UnderleafAppShell
      variant={setup ? 'setup' : 'unauthenticated'}
      navigation={navigation}
    >
      <main id="main-content" className="underleaf-auth-main">
        <section
          className="underleaf-auth-panel"
          aria-labelledby="underleaf-auth-heading"
        >
          <h1 id="underleaf-auth-heading" ref={headingRef} tabIndex={-1}>
            {t(heading)}
          </h1>
          {setup && step === 'welcome' ? (
            <>
              <p>{t('underleaf_welcome_intro')}</p>
              <OLButton onClick={() => setStep('administrator')}>
                {t('underleaf_get_started')}
              </OLButton>
            </>
          ) : setup && step === 'ready' ? (
            <>
              <p role="status">{t('underleaf_ready_intro')}</p>
              <OLButton onClick={() => navigate('/project')}>
                {t('underleaf_open_projects')}
              </OLButton>
            </>
          ) : (
            <>
              {setup && <p>{t('underleaf_administrator_intro')}</p>}
              {error && (
                <div className="alert alert-danger" role="alert">
                  {error}
                </div>
              )}
              {offerLogin ? (
                <a className="btn btn-primary" href="/login">
                  {t('log_in')}
                </a>
              ) : (
                <OLForm onSubmit={submit} aria-busy={busy}>
                  {setup && (
                    <OLFormGroup controlId="underleaf-display-name">
                      <OLFormLabel>{t('underleaf_display_name')}</OLFormLabel>
                      <OLFormControl
                        name="displayName"
                        type="text"
                        autoComplete="name"
                        maxLength={255}
                        disabled={busy}
                      />
                    </OLFormGroup>
                  )}
                  <OLFormGroup controlId="underleaf-username">
                    <OLFormLabel>{t('underleaf_username')}</OLFormLabel>
                    <OLFormControl
                      name="username"
                      type="text"
                      autoComplete="username"
                      autoCapitalize="none"
                      spellCheck={false}
                      required
                      maxLength={32}
                      minLength={setup ? 3 : undefined}
                      autoFocus={!setup}
                      disabled={busy}
                      aria-describedby={
                        setup ? 'underleaf-username-help' : undefined
                      }
                    />
                    {setup && (
                      <p
                        id="underleaf-username-help"
                        className="underleaf-auth-help"
                      >
                        {t('underleaf_username_help')}
                      </p>
                    )}
                  </OLFormGroup>
                  <OLFormGroup controlId="underleaf-password">
                    <OLFormLabel>{t('password')}</OLFormLabel>
                    <OLFormControl
                      name="password"
                      type="password"
                      autoComplete={setup ? 'new-password' : 'current-password'}
                      required
                      maxLength={setup ? 72 : undefined}
                      disabled={busy}
                    />
                  </OLFormGroup>
                  {setup && (
                    <OLFormGroup controlId="underleaf-confirm-password">
                      <OLFormLabel>
                        {t('underleaf_confirm_password')}
                      </OLFormLabel>
                      <OLFormControl
                        name="confirmPassword"
                        type="password"
                        autoComplete="new-password"
                        required
                        maxLength={72}
                        disabled={busy}
                      />
                    </OLFormGroup>
                  )}
                  <OLButton
                    type="submit"
                    className="underleaf-auth-submit"
                    isLoading={busy}
                  >
                    {t(setup ? 'underleaf_create_administrator' : 'log_in')}
                  </OLButton>
                </OLForm>
              )}
            </>
          )}
        </section>
      </main>
    </UnderleafAppShell>
  )
}
