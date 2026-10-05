import '../utils/meta'
import '../utils/webpack-public-path'
import '../infrastructure/error-reporter'
import '@/i18n'
import { createRoot } from 'react-dom/client'
import getMeta from '@/utils/meta'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import UnderleafAuthPage from '@/features/underleaf-auth/components/underleaf-auth-page'

function Root() {
  const { isReady, error } = useWaitForI18n()
  if (error) throw error
  if (!isReady) return null
  return (
    <UnderleafAuthPage
      page={getMeta('ol-underleafAuthPage')}
      sessionExpired={getMeta('ol-underleafSessionExpired')}
    />
  )
}

const element = document.getElementById('underleaf-auth-root')
if (element) createRoot(element).render(<Root />)
