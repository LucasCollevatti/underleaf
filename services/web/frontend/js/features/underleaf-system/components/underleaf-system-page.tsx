import { useTranslation } from 'react-i18next'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import { UnderleafFooter } from '@/shared/components/underleaf/underleaf-footer'
import OLButton from '@/shared/components/ol/ol-button'
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
  return (
    <UnderleafAppProviders>
      <UnderleafAppShell
        variant={data.signedIn ? 'authenticated' : 'unauthenticated'}
        activePage={data.kind === 'status' ? 'system' : undefined}
      >
        <main id="main-content" className="underleaf-system-main">
          <section
            className="underleaf-system-panel"
            aria-labelledby="underleaf-system-heading"
          >
            {data.code && <p className="underleaf-system-code">{data.code}</p>}
            <h1 id="underleaf-system-heading">{data.title}</h1>
            {data.descriptionHtml ? (
              <div dangerouslySetInnerHTML={{ __html: data.descriptionHtml }} />
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
        </main>
        <UnderleafFooter />
      </UnderleafAppShell>
    </UnderleafAppProviders>
  )
}
