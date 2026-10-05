import { useTranslation } from 'react-i18next'
import { memo, useEffect, useState } from 'react'
import { useConnectionContext } from '@/features/ide-react/context/connection-context'
import {
  OLModal,
  OLModalBody,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'
import { useFeatureFlag } from '@/shared/context/split-test-context'
import getMeta from '@/utils/meta'
import OLButton from '@/shared/components/ol/ol-button'
import { useUnsavedDocsContext } from '@/features/ide-react/context/unsaved-docs-context'
import { UnsavedDocsAlert } from '@/features/ide-react/components/unsaved-docs/unsaved-docs-alert'

// show modal when editor is forcefully disconnected
function ForceDisconnected() {
  const { connectionState } = useConnectionContext()
  const { unsavedDocs } = useUnsavedDocsContext()
  const sessionExpired =
    getMeta('ol-ExposedSettings').underleaf &&
    connectionState.error === 'not-logged-in'
  const { t } = useTranslation()
  const [secondsUntilRefresh, setSecondsUntilRefresh] = useState(0)
  const [show, setShow] = useState(false)
  const themed = useFeatureFlag('themed-modals')

  useEffect(() => {
    if (
      connectionState.forceDisconnected &&
      // out of sync has its own modal
      connectionState.error !== 'out-of-sync'
    ) {
      setShow(true)
    }
  }, [connectionState.forceDisconnected, connectionState.error])

  useEffect(() => {
    if (connectionState.forceDisconnected) {
      setSecondsUntilRefresh(connectionState.forcedDisconnectDelay)
    }
  }, [connectionState.forceDisconnected, connectionState.forcedDisconnectDelay])

  useEffect(() => {
    if (show && !sessionExpired) {
      const timer = window.setInterval(() => {
        setSecondsUntilRefresh(seconds => Math.max(0, seconds - 1))
      }, 1000)

      return () => {
        window.clearInterval(timer)
      }
    }
  }, [show, sessionExpired])

  if (!show) {
    return null
  }

  return (
    <OLModal
      show
      // It's not possible to hide this modal, but it's a required prop
      onHide={() => {}}
      className="lock-editor-modal"
      backdrop={false}
      keyboard={false}
      themed={themed}
    >
      <OLModalHeader closeButton={false}>
        <OLModalTitle>
          {t(sessionExpired ? 'underleaf_session_expired' : 'please_wait')}
        </OLModalTitle>
      </OLModalHeader>
      <OLModalBody>
        {sessionExpired ? (
          <>
            <p>{t('underleaf_editor_session_expired')}</p>
            {unsavedDocs.size > 0 && (
              <UnsavedDocsAlert unsavedDocs={unsavedDocs} />
            )}
            <div className="underleaf-system-actions">
              <OLButton
                href="/login?session=expired&redir=/project"
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('log_in')}
              </OLButton>
              <OLButton
                variant="secondary"
                onClick={() => window.location.reload()}
              >
                {t('underleaf_reload_after_login')}
              </OLButton>
            </div>
          </>
        ) : (
          t('were_performing_maintenance', { seconds: secondsUntilRefresh })
        )}
      </OLModalBody>
    </OLModal>
  )
}

export default memo(ForceDisconnected)
