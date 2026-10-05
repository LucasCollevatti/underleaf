import { useTranslation } from 'react-i18next'
import OLRow from '@/shared/components/ol/ol-row'
import OLCol from '@/shared/components/ol/ol-col'
import OLButton from '@/shared/components/ol/ol-button'
import getMeta from '@/utils/meta'

type InviteProps = {
  projectName: string
  username: string
  submitHandler: () => void
  isLoading?: boolean
}

function Invite({
  projectName,
  username,
  submitHandler,
  isLoading,
}: InviteProps) {
  const { t } = useTranslation()
  const { appName } = getMeta('ol-ExposedSettings')

  return (
    <div className="container">
      <OLRow>
        <OLCol lg={{ span: 6, offset: 3 }}>
          <div className="project-join-container">
            <img src="/underleaf-logo.png" alt={appName} />
            <h1 className="h4 mb-2">
              {`You’re joining ${projectName} as @${username}`}
            </h1>
            <div className="mb-4">
              Your display name and username will be visible to project editors.
            </div>
            <OLButton
              variant="primary"
              size="lg"
              disabled={isLoading}
              isLoading={isLoading}
              loadingLabel={`${t('joining')}…`}
              onClick={submitHandler}
            >
              {t('join_project_lowercase')}
            </OLButton>
          </div>
        </OLCol>
      </OLRow>
    </div>
  )
}

export default Invite
