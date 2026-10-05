import { useTranslation } from 'react-i18next'

export function UnderleafFooter() {
  const { t } = useTranslation()
  return (
    <footer className="underleaf-product-footer">
      <p>
        <strong>Underleaf</strong> ·{' '}
        <a
          href="https://github.com/LucasCollevatti/underleaf"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('underleaf_source_code')}
        </a>
      </p>
      <p className="small mb-0">
        {t('underleaf_origin_notice')}{' '}
        <a
          href="https://github.com/LucasCollevatti/underleaf/blob/main/LICENSE"
          target="_blank"
          rel="noopener noreferrer"
        >
          {t('license')}
        </a>
      </p>
    </footer>
  )
}
