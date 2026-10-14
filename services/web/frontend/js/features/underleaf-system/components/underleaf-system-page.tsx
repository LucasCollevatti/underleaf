import { useTranslation } from 'react-i18next'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import { UnderleafFooter } from '@/shared/components/underleaf/underleaf-footer'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import UnderleafPageSkeleton from '@/shared/components/underleaf/underleaf-page-skeleton'
import OLButton from '@/shared/components/ol/ol-button'
import MaterialIcon from '@/shared/components/material-icon'
import getMeta from '@/utils/meta'
import { OfflineDocBackup } from '@/features/ide-react/editor/offline-doc-backup'
import { ConnectionOutageTracker } from '@/features/ide-react/editor/connection-outage-tracker'
import type { UnderleafSystemPageData } from '../../../../../types/underleaf-system'

export default function UnderleafSystemPage({
  data,
}: {
  data: UnderleafSystemPageData
}) {
  const { t, i18n } = useTranslation()
  const { isReady } = useWaitForI18n()

  if (!isReady && data.kind === 'status') {
    return (
      <UnderleafAppProviders>
        <UnderleafAppShell
          variant={data.signedIn ? 'authenticated' : 'unauthenticated'}
          activePage={data.signedIn ? 'system' : undefined}
        >
          <UnderleafPageSkeleton variant="system" />
          <UnderleafFooter />
        </UnderleafAppShell>
      </UnderleafAppProviders>
    )
  }

  return (
    <UnderleafAppProviders>
      <UnderleafAppShell
        variant={data.signedIn ? 'authenticated' : 'unauthenticated'}
        activePage={data.kind === 'status' ? 'system' : undefined}
      >
        <main id="main-content" className="underleaf-system-main">
          {data.kind === 'status' && data.status ? (
            <StatusContent data={{ ...data, status: data.status }} />
          ) : (
            <section
              className="underleaf-system-panel"
              aria-labelledby="underleaf-system-heading"
            >
              {data.code && (
                <p className="underleaf-system-code">{data.code}</p>
              )}
              <h1 id="underleaf-system-heading">{data.title}</h1>
              {data.descriptionHtml ? (
                <div
                  dangerouslySetInnerHTML={{ __html: data.descriptionHtml }}
                />
              ) : (
                <p>{data.description}</p>
              )}
              {data.detail && (
                <p className="alert alert-danger" role="alert">
                  {data.detail}
                </p>
              )}
              {data.status && (
                <>
                  <dl className="underleaf-system-status">
                    <dt>{t('underleaf_status_web')}</dt>
                    <dd>
                      {t(
                        data.status.shuttingDown
                          ? 'underleaf_status_stopping'
                          : 'underleaf_status_ready'
                      )}
                    </dd>
                    <dt>{t('underleaf_status_site')}</dt>
                    <dd>
                      {t(
                        data.status.siteOpen
                          ? 'underleaf_status_ready'
                          : 'underleaf_status_closed'
                      )}
                    </dd>
                    <dt>{t('underleaf_status_editor')}</dt>
                    <dd>
                      {t(
                        data.status.editorOpen
                          ? 'underleaf_status_ready'
                          : 'underleaf_status_closed'
                      )}
                    </dd>
                    <dt>{t('underleaf_status_uptime')}</dt>
                    <dd>
                      {data.status.uptimeSeconds.toLocaleString(i18n.language)}
                    </dd>
                  </dl>
                  <p className="small">
                    {t('underleaf_status_checked_at')}{' '}
                    <time dateTime={data.status.checkedAt}>
                      {new Date(data.status.checkedAt).toLocaleString(
                        i18n.language
                      )}
                    </time>
                  </p>
                </>
              )}
              {data.kind === 'logout' ? (
                <form
                  method="POST"
                  action="/logout"
                  onSubmit={() => {
                    OfflineDocBackup.clearAll()
                    ConnectionOutageTracker.clearAll()
                  }}
                >
                  <input
                    type="hidden"
                    name="_csrf"
                    value={getMeta('ol-csrfToken')}
                  />
                  <div className="underleaf-system-actions">
                    <OLButton type="submit">{t('log_out')}</OLButton>
                    <OLButton href="/project" variant="secondary">
                      {t('cancel')}
                    </OLButton>
                  </div>
                </form>
              ) : (
                <div className="underleaf-system-actions">
                  <OLButton
                    href={
                      data.kind === 'session-expired'
                        ? '/login?session=expired'
                        : data.backPath
                    }
                  >
                    {data.kind === 'session-expired'
                      ? t('log_in')
                      : data.backLabel}
                  </OLButton>
                  {(data.kind === 'error' && (data.code || 0) >= 500) ||
                  data.kind === 'maintenance' ||
                  data.kind === 'session-expired' ? (
                    <OLButton
                      variant="secondary"
                      onClick={() => window.location.reload()}
                    >
                      {t('refresh')}
                    </OLButton>
                  ) : null}
                  {data.kind === 'status' && (
                    <OLButton variant="secondary" href="/status">
                      {t('refresh')}
                    </OLButton>
                  )}
                </div>
              )}
            </section>
          )}
        </main>
        <UnderleafFooter />
      </UnderleafAppShell>
    </UnderleafAppProviders>
  )
}

function StatusContent({
  data,
}: {
  data: {
    description: string
    status: NonNullable<UnderleafSystemPageData['status']>
  }
}) {
  const { t, i18n } = useTranslation()
  const status = data.status
  const services = [
    {
      title: 'Web process',
      description: 'Serving requests on port 8080',
      icon: 'dns',
      ready: !status.shuttingDown,
    },
    {
      title: 'Site access',
      description: 'Public URL is reachable',
      icon: 'public',
      ready: status.siteOpen,
    },
    {
      title: 'Editor',
      description: 'Editor assets loaded',
      icon: 'description',
      ready: status.editorOpen,
    },
  ]
  const checkedMinutes = Math.floor(
    Math.max(0, Date.now() - new Date(status.checkedAt).getTime()) / 60000
  )
  const checkedText = checkedMinutes
    ? `Checked ${checkedMinutes} min ago`
    : 'Checked just now'
  const allReady = services.every(service => service.ready)

  return (
    <div className="underleaf-system-status-content">
      <header className="underleaf-system-heading">
        <div className="underleaf-page-heading">
          <h1>
            {t('underleaf_system_status_title', {
              defaultValue: 'System status',
            })}
          </h1>
          <p>{checkedText}</p>
        </div>
        <OLButton
          variant="secondary"
          leadingIcon="refresh"
          onClick={() => window.location.reload()}
        >
          {t('refresh')}
        </OLButton>
      </header>

      <div
        className={`underleaf-system-summary ${allReady ? 'is-ready' : 'is-warning'}`}
        role="status"
      >
        <MaterialIcon type={allReady ? 'check_circle' : 'warning'} />
        <span>
          {allReady
            ? 'All checked services are running'
            : 'Some checked services need attention'}
        </span>
      </div>

      <section className="underleaf-system-services" aria-label="Services">
        {services.map(service => (
          <div className="underleaf-system-service" key={service.title}>
            <MaterialIcon type={service.icon} />
            <div>
              <strong>{service.title}</strong>
              <p>{service.description}</p>
            </div>
            <span
              className={`underleaf-system-service-status ${service.ready ? 'is-ready' : 'is-warning'}`}
            >
              <span aria-hidden="true" />
              {service.ready ? 'Ready' : 'Unavailable'}
            </span>
          </div>
        ))}
        <div className="underleaf-system-service">
          <MaterialIcon type="schedule" />
          <div>
            <strong>Uptime</strong>
            <p>Since last container start</p>
          </div>
          <span className="underleaf-system-service-status is-neutral">
            {formatUptime(status.uptimeSeconds, i18n.language)}
          </span>
        </div>
      </section>

      <div className="underleaf-system-note">
        <MaterialIcon type="info" />
        <p>{data.description}</p>
      </div>
    </div>
  )
}

function formatUptime(seconds: number, locale: string) {
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  if (days) return `${days}d ${hours % 24}h`
  if (hours) return `${hours}h ${minutes % 60}m`
  return `${minutes.toLocaleString(locale)}m`
}
