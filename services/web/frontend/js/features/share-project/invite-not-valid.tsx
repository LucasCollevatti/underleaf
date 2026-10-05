import { useTranslation } from 'react-i18next'
import OLRow from '@/shared/components/ol/ol-row'
import OLCol from '@/shared/components/ol/ol-col'
import OLButton from '@/shared/components/ol/ol-button'
import getMeta from '@/utils/meta'

type InviteNotValidProps = {
  username?: string
}

function InviteNotValid({ username }: InviteNotValidProps) {
  const { t } = useTranslation()
  const { appName } = getMeta('ol-ExposedSettings')

  return (
    <div className="container">
      <OLRow>
        <OLCol lg={{ span: 6, offset: 3 }}>
          <div className="project-join-container">
            <img src="/underleaf-logo.png" alt={appName} />
            <h1 className="h4 mb-2">
              {t('sorry_this_project_is_not_available')}
            </h1>
            <div className="mb-4">
              {t('the_link_may_be_broken_or_you_may_not_have_access_rights')}
            </div>
            {username && (
              <>
                <OLButton
                  variant="primary"
                  size="lg"
                  href="/project"
                  className="mb-4"
                >
                  {t('back_to_my_projects')}
                </OLButton>
                <div>
                  <small>
                    You are logged in as <b>@{username}</b>. You may need to log
                    in with another account.
                  </small>
                </div>
              </>
            )}
          </div>
        </OLCol>
      </OLRow>
    </div>
  )
}

export default InviteNotValid
