import '../utils/meta'
import '../utils/webpack-public-path'
import '../infrastructure/error-reporter'
import '@/i18n'
import { createRoot } from 'react-dom/client'
import getMeta from '@/utils/meta'
import useWaitForI18n from '@/shared/hooks/use-wait-for-i18n'
import withErrorBoundary from '@/infrastructure/error-boundary'
import { GenericErrorBoundaryFallback } from '@/shared/components/generic-error-boundary-fallback'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import UnderleafPageSkeleton from '@/shared/components/underleaf/underleaf-page-skeleton'
import UnderleafAdminPage from '@/features/underleaf-admin/components/underleaf-admin-page'

function Root() {
  const { isReady, error } = useWaitForI18n()
  if (error) throw error
  if (!isReady) {
    const data = getMeta('ol-underleafAdmin')
    return (
      <UnderleafAppProviders>
        <UnderleafAppShell
          activePage={data.page === 'users' ? 'users' : 'admin'}
        >
          <UnderleafPageSkeleton
            variant={data.page === 'users' ? 'users' : 'admin'}
          />
        </UnderleafAppShell>
      </UnderleafAppProviders>
    )
  }
  return <UnderleafAdminPage data={getMeta('ol-underleafAdmin')} />
}

const Page = withErrorBoundary(Root, () => <GenericErrorBoundaryFallback />)
const element = document.getElementById('underleaf-admin-root')
if (element) createRoot(element).render(<Page />)
