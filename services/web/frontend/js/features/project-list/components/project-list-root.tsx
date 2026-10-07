import { ReactNode } from 'react'
import {
  ProjectListProvider,
  useProjectListContext,
} from '../context/project-list-context'
import { SplitTestProvider } from '@/shared/context/split-test-context'
import { ColorPickerProvider } from '../context/color-picker-context'
import { useTranslation } from 'react-i18next'
import useWaitForI18n from '../../../shared/hooks/use-wait-for-i18n'
import LoadingBranded from '../../../shared/components/loading-branded'
import UnderleafPageSkeleton from '../../../shared/components/underleaf/underleaf-page-skeleton'
import SystemMessages from '../../../shared/components/system-messages'
import withErrorBoundary from '../../../infrastructure/error-boundary'
import { GenericErrorBoundaryFallback } from '@/shared/components/generic-error-boundary-fallback'
import getMeta from '@/utils/meta'
import DefaultNavbar from '@/shared/components/navbar/default-navbar'
import Footer from '@/shared/components/footer/footer'
import WelcomePageContent from '@/features/project-list/components/welcome-page-content'
import { ProjectListDsNav } from '@/features/project-list/components/project-list-ds-nav'
import { DsNavStyleProvider } from '@/features/project-list/components/use-is-ds-nav'
import useThemedPage from '@/shared/hooks/use-themed-page'
import { UserSettingsProvider } from '@/shared/context/user-settings-context'
import { TutorialProvider } from '@/shared/context/tutorial-context'
import SidebarDsNav from '@/features/project-list/components/sidebar/sidebar-ds-nav'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'

function ProjectListRoot() {
  const { isReady } = useWaitForI18n()

  if (!isReady) {
    if (!getMeta('ol-ExposedSettings')?.underleaf) return null

    return (
      <UnderleafAppProviders>
        <UnderleafAppShell activePage="projects">
          <UnderleafPageSkeleton variant="projects" />
        </UnderleafAppShell>
      </UnderleafAppProviders>
    )
  }

  return <ProjectListRootInner />
}

export function ProjectListRootInner() {
  return (
    <ProjectListProvider>
      <ColorPickerProvider>
        <SplitTestProvider>
          <TutorialProvider>
            <UserSettingsProvider>
              <ProjectListPageContent />
            </UserSettingsProvider>
          </TutorialProvider>
        </SplitTestProvider>
      </ColorPickerProvider>
    </ProjectListProvider>
  )
}

function DefaultNavbarAndFooter({ children }: { children: ReactNode }) {
  const navbarProps = getMeta('ol-navbar')
  const footerProps = getMeta('ol-footer')

  return (
    <>
      <DefaultNavbar {...navbarProps} />
      <main
        className="content content-alt project-list-react"
        aria-labelledby="main-content"
      >
        {children}
      </main>
      <Footer {...footerProps} />
    </>
  )
}

function DefaultPageContentWrapper({ children }: { children: ReactNode }) {
  return (
    <DefaultNavbarAndFooter>
      <SystemMessages />
      <div className="project-list-wrapper">{children}</div>
    </DefaultNavbarAndFooter>
  )
}

function ProjectListPageContent() {
  useThemedPage()
  const { totalProjectsCount, isLoading, loadProgress } =
    useProjectListContext()
  const isUnderleaf = getMeta('ol-ExposedSettings')?.underleaf


  const { t } = useTranslation()

  if (isLoading) {
    if (isUnderleaf) {
      return (
        <UnderleafAppShell
          sidebar={<SidebarDsNav activePage="projects" />}
        >
          <UnderleafPageSkeleton variant="projects" />
        </UnderleafAppShell>
      )
    }

    const loadingComponent = (
      <LoadingBranded loadProgress={loadProgress} label={t('loading')} />
    )

    return loadingComponent
  }

  if (!isUnderleaf && totalProjectsCount === 0) {
    return (
      <>
        <DefaultPageContentWrapper>
          <WelcomePageContent />
        </DefaultPageContentWrapper>
      </>
    )
  }
  return (
    <DsNavStyleProvider>
      <ProjectListDsNav />
    </DsNavStyleProvider>
  )
}

export default withErrorBoundary(ProjectListRoot, () => (
  <GenericErrorBoundaryFallback />
))
