import { type ReactNode } from 'react'
import classNames from 'classnames'
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
  pageClassName,
  ...sidebarProps
}: UnderleafSidebarProps & {
  children: ReactNode
  header?: ReactNode
  sidebar?: ReactNode
  pageClassName?: string
}) {
  useThemedPage()

  return (
    <div
      className={classNames(
        'project-ds-nav-page website-redesign underleaf-app-shell',
        pageClassName,
      )}
    >
      {header && <div className="underleaf-app-header">{header}</div>}
      <div className="project-list-wrapper underleaf-app-layout">
        {sidebar ?? <UnderleafSidebar {...sidebarProps} />}
        <div className="underleaf-app-content">{children}</div>
      </div>
    </div>
  )
}
