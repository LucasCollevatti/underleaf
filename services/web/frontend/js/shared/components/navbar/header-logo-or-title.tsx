import type { DefaultNavbarMetadata } from '@/shared/components/types/default-navbar-metadata'
import getMeta from '@/utils/meta'
import { UnderleafBrand } from '@/shared/components/underleaf/underleaf-brand'

export default function HeaderLogoOrTitle({
  overleafLogo,
  customLogo,
  title,
}: Pick<DefaultNavbarMetadata, 'customLogo' | 'title'> & {
  overleafLogo?: string
}) {
  const { appName, underleaf } = getMeta('ol-ExposedSettings')
  if (underleaf)
    return (
      <a
        href="/project"
        aria-label="Underleaf"
        className="underleaf-navbar-brand"
      >
        <UnderleafBrand />
      </a>
    )
  const logoUrl = customLogo ?? overleafLogo
  return (
    <a href="/" aria-label={appName} className="navbar-brand">
      {(customLogo || !title) && (
        <div
          className="navbar-logo"
          style={logoUrl ? { backgroundImage: `url("${logoUrl}")` } : {}}
        />
      )}
      {title && (
        <div className="navbar-title">
          <span>{title}</span>
        </div>
      )}
    </a>
  )
}
