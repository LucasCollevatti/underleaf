import { UnderleafBrand } from '@/shared/components/underleaf/underleaf-brand'

export function DsNavOverleafLogo() {
  return (
    <div className="ds-nav-page-switcher-logo">
      <a href="/project" aria-label="Underleaf">
        <UnderleafBrand />
      </a>
    </div>
  )
}
