import OLTooltip from '@/shared/components/ol/ol-tooltip'
import MaterialIcon from '@/shared/components/material-icon'
import { useTranslation } from 'react-i18next'
import { Cobranding } from '../../../../../../types/cobranding'
import getMeta from '@/utils/meta'

type ToolbarLogosProps = {
  cobranding?: Cobranding
}

export const ToolbarLogos = ({ cobranding }: ToolbarLogosProps) => {
  const { t } = useTranslation()
  const isUnderleaf = getMeta('ol-ExposedSettings').underleaf

  return (
    <div className="ide-redesign-toolbar-logos">
      <OLTooltip
        id="tooltip-home-button"
        description={t('back_to_your_projects')}
        overlayProps={{ delay: 0, placement: 'bottom' }}
      >
        <div className="ide-redesign-toolbar-home-button">
          <a
            href="/project"
            className="ide-redesign-toolbar-home-link"
            aria-label={t('back_to_your_projects')}
          >
            <span
              className="toolbar-ol-logo"
              aria-label={isUnderleaf ? 'Underleaf' : t('overleaf_logo')}
              role="img"
            />
            <MaterialIcon type="home" className="toolbar-ol-home-button" />
          </a>
        </div>
      </OLTooltip>
      {!isUnderleaf && cobranding && cobranding.logoImgUrl && (
        <>
          <span className="ide-redesign-toolbar-cobranding-separator" />
          <a
            className="ide-redesign-toolbar-cobranding-link"
            href={cobranding.brandVariationHomeUrl}
            target="_blank"
            rel="noreferrer noopener"
          >
            <img
              src={cobranding.logoImgUrl}
              className="ide-redesign-toolbar-cobranding-logo"
              alt={cobranding.brandVariationName}
            />
          </a>
        </>
      )}
    </div>
  )
}
