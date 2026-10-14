import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import sinon from 'sinon'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import ThemeToggle from '@/shared/components/sidebar/theme-toggle'
import UnderleafPageSkeleton from '@/shared/components/underleaf/underleaf-page-skeleton'
import { defaultSettings } from '@/shared/context/user-settings-context'
import {
  readBrowserOverallTheme,
  writeBrowserOverallTheme,
} from '@/shared/utils/overall-theme-preference'

function renderPage(
  variant: 'authenticated' | 'unauthenticated' | 'setup' = 'unauthenticated'
) {
  return render(
    <UnderleafAppProviders>
      <UnderleafAppShell variant={variant} activePage="users">
        <main id="main-content">Page content</main>
      </UnderleafAppShell>
    </UnderleafAppProviders>
  )
}

describe('<UnderleafAppShell />', function () {
  let previousMeta: typeof window.metaAttributesCache

  beforeEach(function () {
    previousMeta = window.metaAttributesCache
    window.metaAttributesCache = new Map()
    window.metaAttributesCache.set('ol-ExposedSettings', {
      appName: 'Underleaf',
      underleaf: true,
    })
    window.metaAttributesCache.set('ol-navbar', { items: [] })
    localStorage.clear()
  })

  afterEach(function () {
    cleanup()
    sinon.restore()
    fetchMock.removeRoutes().clearHistory()
    localStorage.clear()
    window.metaAttributesCache = previousMeta
    delete document.body.dataset.theme
  })

  it('keeps guest navigation private and offers the existing three theme choices', function () {
    window.metaAttributesCache.set('ol-navbar', {
      canDisplayAdminMenu: true,
    })
    renderPage()

    expect(screen.queryByRole('link', { name: 'Projects' })).to.be.null
    expect(screen.queryByRole('link', { name: 'Administration' })).to.be.null
    expect(screen.getByRole('radio', { name: 'System' })).to.exist
    expect(screen.getByRole('radio', { name: 'Light' })).to.exist
    expect(screen.getByRole('radio', { name: 'Dark' })).to.exist
  })

  it('uses server-provided admin visibility and marks the current page', function () {
    window.metaAttributesCache.set('ol-navbar', {
      canDisplayAdminMenu: true,
    })
    renderPage('authenticated')

    expect(screen.getByRole('link', { name: 'Projects' })).to.exist
    expect(
      screen.getByRole('link', { name: 'Administration' }).getAttribute('href')
    ).to.equal('/admin')
    expect(
      screen.getByRole('link', { name: 'Users' }).getAttribute('aria-current')
    ).to.equal('page')
    expect(
      screen.getByRole('link', { name: 'System' }).getAttribute('href')
    ).to.equal('/status')
  })

  it('keeps administrator navigation in the fixed lower sidebar section', function () {
    window.metaAttributesCache.set('ol-navbar', {
      canDisplayAdminMenu: true,
    })
    renderPage('authenticated')

    const administration = screen.getByRole('navigation', {
      name: 'Underleaf administration',
    })
    const lowerSection = administration.closest('.underleaf-sidebar-lower')

    expect(lowerSection).to.exist
    expect(
      lowerSection?.contains(screen.getByRole('radio', { name: 'System' }))
    ).to.be.true
  })

  it('moves account settings into the account menu for ordinary users', async function () {
    renderPage('authenticated')
    expect(screen.getByRole('link', { name: 'Projects' })).to.exist
    expect(screen.queryByRole('link', { name: 'Administration' })).to.be.null
    expect(screen.queryByRole('link', { name: 'Account settings' })).to.be.null

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(
      screen
        .getByRole('link', { name: 'Account settings' })
        .getAttribute('href')
    ).to.equal('/user/settings')
  })

  it('collapses project filters away from the projects page', function () {
    window.metaAttributesCache.set('ol-navbar', {
      sessionUser: { username: 'ada', displayName: 'Ada' },
    })
    renderPage('authenticated')

    expect(screen.getByRole('link', { name: 'Projects' })).to.exist
    expect(screen.queryByRole('link', { name: 'Your projects' })).to.be.null
  })

  it('renders a page-shaped skeleton for each Underleaf loading state', function () {
    const page = render(<UnderleafPageSkeleton variant="projects" />)

    expect(screen.getByRole('status', { name: 'Loading' })).to.exist
    expect(page.container.querySelector('.underleaf-skeleton-project-table')).to
      .exist

    page.rerender(<UnderleafPageSkeleton variant="settings" />)
    expect(page.container.querySelector('.underleaf-skeleton-card-grid')).to
      .exist

    page.rerender(<UnderleafPageSkeleton variant="admin" />)
    expect(page.container.querySelector('.underleaf-skeleton-stat-grid')).to
      .exist

    page.rerender(<UnderleafPageSkeleton variant="users" />)
    expect(page.container.querySelector('.underleaf-skeleton-admin-search')).to
      .exist
  })

  it('opens the account menu and closes it when clicking outside', async function () {
    window.metaAttributesCache.set('ol-navbar', {
      sessionUser: { username: 'ada', displayName: 'Ada' },
    })
    renderPage('authenticated')

    await userEvent.click(screen.getByRole('button', { name: 'Account menu' }))
    expect(screen.getByRole('link', { name: 'Account settings' })).to.exist
    expect(screen.getByRole('button', { name: 'Log out' })).to.exist

    fireEvent.mouseDown(document.body)
    expect(screen.queryByRole('button', { name: 'Log out' })).to.be.null
  })

  it('persists guest theme across login/setup mounts without saving account settings', async function () {
    const saves = fetchMock.post('express:/user/settings', { status: 200 })
    const page = renderPage()
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))

    expect(document.body.dataset.theme).to.equal('default')
    expect(
      screen.getByRole('img', { name: 'Underleaf' }).getAttribute('src')
    ).to.equal('/underleaf-lockup-dark.svg')
    page.unmount()
    renderPage('setup')
    expect(
      (screen.getByRole('radio', { name: 'Dark' }) as HTMLInputElement).checked
    ).to.be.true
    expect(saves.callHistory.called('/user/settings')).to.be.false
  })

  it('keeps account theme authoritative and saves authenticated changes to the existing endpoint', async function () {
    writeBrowserOverallTheme('')
    window.metaAttributesCache.set('ol-user_id', 'user-id')
    window.metaAttributesCache.set('ol-userSettings', {
      ...defaultSettings,
      overallTheme: 'light-',
    })
    const saves = fetchMock.post('express:/user/settings', { status: 200 })
    renderPage('authenticated')

    expect(document.body.dataset.theme).to.equal('light')
    await userEvent.click(screen.getByRole('radio', { name: 'Dark' }))
    expect(
      saves.callHistory.called('/user/settings', {
        body: { overallTheme: '' },
      })
    ).to.be.true
    expect(readBrowserOverallTheme()).to.equal('')
  })

  it('synchronizes multiple theme controls and keeps their radio groups unique', async function () {
    render(
      <UnderleafAppProviders>
        <UnderleafAppShell variant="unauthenticated">
          <ThemeToggle />
        </UnderleafAppShell>
      </UnderleafAppProviders>
    )
    const groups = screen.getAllByRole('group', { name: 'Theme' })
    const firstDark = within(groups[0]).getByRole('radio', {
      name: 'Dark',
    }) as HTMLInputElement
    const secondDark = within(groups[1]).getByRole('radio', {
      name: 'Dark',
    }) as HTMLInputElement
    expect(firstDark.id).not.to.equal(secondDark.id)
    expect(firstDark.name).not.to.equal(secondDark.name)

    await userEvent.click(firstDark)
    expect(firstDark.checked).to.be.true
    expect(secondDark.checked).to.be.true
  })

  it('follows operating system changes while System is selected', function () {
    const listeners = new Set<(event: MediaQueryListEvent) => void>()
    sinon.stub(window, 'matchMedia').returns({
      matches: false,
      addEventListener: (
        _type: string,
        callback: (event: MediaQueryListEvent) => void
      ) => {
        listeners.add(callback)
      },
      removeEventListener() {},
    } as unknown as MediaQueryList)
    renderPage()
    expect(document.body.dataset.theme).to.equal('light')
    act(() => {
      for (const listener of listeners)
        listener({ matches: true } as MediaQueryListEvent)
    })
    expect(document.body.dataset.theme).to.equal('default')
  })

  it('connects the compact sidebar button to its expandable navigation', async function () {
    renderPage()
    const menu = screen.getByRole('button', { name: 'Menu' })
    expect(document.getElementById(menu.getAttribute('aria-controls')!)).to
      .exist
    expect(menu.getAttribute('aria-expanded')).to.equal('false')
    await userEvent.click(menu)
    expect(menu.getAttribute('aria-expanded')).to.equal('true')
  })
})
