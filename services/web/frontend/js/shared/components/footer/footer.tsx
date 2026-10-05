import { FooterMetadata } from '@/shared/components/types/footer-metadata'
import ThinFooter from '@/shared/components/footer/thin-footer'
import FatFooter from '@/shared/components/footer/fat-footer'
import getMeta from '@/utils/meta'
import { UnderleafFooter } from '@/shared/components/underleaf/underleaf-footer'

function Footer(props: FooterMetadata) {
  if (getMeta('ol-ExposedSettings').underleaf) return <UnderleafFooter />
  return props.showThinFooter ? <ThinFooter {...props} /> : <FatFooter />
}

export default Footer
