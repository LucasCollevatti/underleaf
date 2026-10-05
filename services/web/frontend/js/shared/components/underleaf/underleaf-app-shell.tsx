import { type ReactNode } from 'react'
import { SplitTestProvider } from '@/shared/context/split-test-context'
import { UserSettingsProvider } from '@/shared/context/user-settings-context'
import { DsNavStyleProvider } from '@/features/project-list/components/use-is-ds-nav'
import useThemedPage from '@/shared/hooks/use-themed-page'
import {
  UnderleafSidebar,
  type UnderleafSidebarProps,
} from './underleaf-sidebar'

// Pages that already provide these contexts (e.g. Projects) use the shell directly.
export function UnderleafAppProviders({ children }: { children: ReactNode }) {
  return (
    <SplitTestProvider>
      <UserSettingsProvider>
        <DsNavStyleProvider>{children}</DsNavStyleProvider>
      </UserSettingsProvider>
    </SplitTestProvider>
  )
}

export function UnderleafAppShell({
  children,
  header,
  sidebar,
  ...sidebarProps
}: UnderleafSidebarProps & {
  children: ReactNode
  header?: ReactNode
  sidebar?: ReactNode
}) {
  useThemedPage()

  return (
    <div className="project-ds-nav-page website-redesign underleaf-app-shell">
      {header && <div className="underleaf-app-header">{header}</div>}
      <div className="project-list-wrapper underleaf-app-layout">
        {sidebar ?? <UnderleafSidebar {...sidebarProps} />}
        <div className="underleaf-app-content">{children}</div>
      </div>
    </div>
  )
}
