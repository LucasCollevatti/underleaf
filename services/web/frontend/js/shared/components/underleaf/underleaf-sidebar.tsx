import { type HTMLAttributes, type ReactNode, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from 'classnames'
import MaterialIcon from '@/shared/components/material-icon'
import ThemeToggle from '@/shared/components/sidebar/theme-toggle'
import { SidebarLowerSection } from '@/shared/components/sidebar/sidebar-lower-section'
import { UnderleafBrand } from './underleaf-brand'
import getMeta from '@/utils/meta'

export type UnderleafSidebarVariant =
  | 'authenticated'
  | 'unauthenticated'
  | 'setup'

export type UnderleafPage =
  | 'projects'
  | 'admin'
  | 'users'
  | 'settings'
  | 'system'

export type UnderleafSidebarProps = HTMLAttributes<HTMLElement> & {
  variant?: UnderleafSidebarVariant
  activePage?: UnderleafPage
  navigation?: ReactNode
  footer?: ReactNode
  resizeHandle?: ReactNode
}

export function UnderleafSidebar({
  variant = 'authenticated',
  activePage,
  navigation,
  footer,
  resizeHandle,
  className,
  ...props
}: UnderleafSidebarProps) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const navigationId = useId()
  const navbar = getMeta('ol-navbar')
  const authenticated = variant === 'authenticated'

  const link = (
    page: UnderleafPage,
    href: string,
    label: string,
    icon: string
  ) => (
    <a
      key={page}
      href={href}
      className={classNames('ds-nav-page-switcher-item', {
        active: activePage === page,
      })}
      aria-current={activePage === page ? 'page' : undefined}
    >
      <MaterialIcon type={icon} />
      <span className="ds-nav-page-switcher-item-label">{label}</span>
    </a>
  )

  return (
    <aside
      {...props}
      className={classNames(
        'project-list-sidebar-wrapper-react',
        'underleaf-sidebar',
        { 'underleaf-sidebar-expanded': expanded },
        className
      )}
    >
      <div className="underleaf-sidebar-brand">
        <a href={authenticated ? '/project' : '/'} aria-label="Underleaf">
          <UnderleafBrand />
        </a>
        <button
          type="button"
          className="underleaf-sidebar-menu btn btn-secondary"
          aria-label={t('menu')}
          aria-expanded={expanded}
          aria-controls={navigationId}
          onClick={() => setExpanded(value => !value)}
        >
          <MaterialIcon type={expanded ? 'close' : 'menu'} />
        </button>
      </div>
      <div id={navigationId} className="underleaf-sidebar-sections">
        <nav className="underleaf-sidebar-navigation" aria-label={t('primary')}>
          {navigation ??
            (authenticated ? (
              link('projects', '/project', t('projects'), 'folder')
            ) : (
              <p className="underleaf-sidebar-description">
                {variant === 'setup'
                  ? t('underleaf_setup_description')
                  : t('underleaf_guest_description')}
              </p>
            ))}
          {authenticated &&
            link(
              'settings',
              '/user/settings',
              t('account_settings'),
              'settings'
            )}
          {authenticated && navbar?.canDisplayAdminMenu && (
            <div className="underleaf-sidebar-administration">
              {link(
                'admin',
                '/admin',
                t('underleaf_administration'),
                'admin_panel_settings'
              )}
              {link('users', '/admin/users', t('underleaf_users'), 'group')}
              {link(
                'system',
                '/status',
                t('underleaf_system'),
                'monitor_heart'
              )}
            </div>
          )}
        </nav>
        <div className="ds-nav-sidebar-lower underleaf-sidebar-lower">
          {footer}
          <ThemeToggle />
          {authenticated && navbar?.sessionUser && <SidebarLowerSection />}
        </div>
      </div>
      {resizeHandle}
    </aside>
  )
}
