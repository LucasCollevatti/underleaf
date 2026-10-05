import { FC } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from '../hooks/use-location'
import { DefaultMessage } from './default-message'
import MaterialIcon from './material-icon'
import OLButton from '@/shared/components/ol/ol-button'
import getMeta from '@/utils/meta'

export const GenericErrorBoundaryFallback: FC<React.PropsWithChildren> = ({
  children,
}) => {
  const { t } = useTranslation()
  const { reload: handleClick } = useLocation()
  const isUnderleaf = getMeta('ol-ExposedSettings').underleaf

  return (
    <div className="error-boundary-container">
      {isUnderleaf && (
        <img
          src="/underleaf-lockup.svg"
          alt="Underleaf"
          width={238}
          height={48}
          className="underleaf-error-brand"
        />
      )}
      <MaterialIcon
        accessibilityLabel={`${t('generic_something_went_wrong')} ${t(
          'please_refresh'
        )}`}
        type="warning"
        size="2x"
      />
      {children || (
        <div className="error-message">
          <DefaultMessage className="small" style={{ fontWeight: 'bold' }} />
        </div>
      )}
      <OLButton variant="primary" onClick={handleClick}>
        {t('refresh')}
      </OLButton>
      {isUnderleaf && <a href="/project">{t('back_to_your_projects')}</a>}
    </div>
  )
}
