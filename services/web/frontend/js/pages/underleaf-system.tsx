import '../utils/meta'
import '../utils/webpack-public-path'
import '../infrastructure/error-reporter'
import localesPromise from '@/i18n'
import { createRoot } from 'react-dom/client'
import getMeta from '@/utils/meta'
import UnderleafSystemPage from '@/features/underleaf-system/components/underleaf-system-page'

const element = document.getElementById('underleaf-system-root')
if (element) {
  // Retain the usable server-rendered shell until translations load. If a
  // frontend asset fails, the HTML page and its navigation/forms still work.
  localesPromise
    .then(() => {
      createRoot(element).render(
        <UnderleafSystemPage data={getMeta('ol-underleafSystem')} />
      )
    })
    .catch(() => {})
}
