import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'chai'
import sinon from 'sinon'
import UnderleafSystemPage from '@/features/underleaf-system/components/underleaf-system-page'
import { OfflineDocBackup } from '@/features/ide-react/editor/offline-doc-backup'
import { ConnectionOutageTracker } from '@/features/ide-react/editor/connection-outage-tracker'
import type { UnderleafSystemPageData } from '../../../../types/underleaf-system'

const guest: UnderleafSystemPageData = {
  kind: 'error',
  code: 404,
  title: 'Page not found',
  description: 'This page does not exist.',
  signedIn: false,
  canAdmin: false,
  backPath: '/login',
  backLabel: 'Log in',
}

describe('<UnderleafSystemPage /> product invariants', function () {
  let previousMeta: typeof window.metaAttributesCache
  beforeEach(function () {
    previousMeta = window.metaAttributesCache
    window.metaAttributesCache = new Map([
      ['ol-ExposedSettings', { appName: 'Underleaf', underleaf: true }],
      ['ol-navbar', { items: [] }],
      ['ol-csrfToken', 'test-csrf'],
    ])
    localStorage.clear()
  })
  afterEach(function () {
    cleanup()
    sinon.restore()
    localStorage.clear()
    window.metaAttributesCache = previousMeta
    delete document.body.dataset.theme
  })

  it('keeps guest errors in the branded shell with a login action and legal origins', function () {
    render(<UnderleafSystemPage data={guest} />)
    expect(screen.getByRole('heading', { name: 'Page not found' })).to.exist
    expect(screen.getByRole('main').id).to.equal('main-content')
    expect(screen.getByRole('img', { name: 'Underleaf' })).to.exist
    expect(
      screen.getByRole('link', { name: 'Log in' }).getAttribute('href')
    ).to.equal('/login')
    expect(screen.queryByRole('link', { name: 'Administration' })).to.be.null
    expect(screen.queryByRole('link', { name: 'Projects' })).to.be.null
    expect(screen.getByRole('contentinfo').textContent).to.include(
      'independent fork'
    )
    expect(screen.getByRole('link', { name: 'License' })).to.exist
    for (const theme of ['System', 'Light', 'Dark'])
      expect(screen.getByRole('radio', { name: theme })).to.exist
  })

  it('shows explicit session recovery without a password-recovery-by-email flow', function () {
    render(
      <UnderleafSystemPage
        data={{
          ...guest,
          kind: 'session-expired',
          code: undefined,
          title: 'Session expired',
        }}
      />
    )
    expect(
      screen.getByRole('link', { name: 'Log in' }).getAttribute('href')
    ).to.equal('/login?session=expired')
    expect(screen.getByRole('button', { name: 'Refresh' })).to.exist
    expect(
      document.querySelector('input[type=email], a[href="/forgot-password"]')
    ).to.be.null
  })

  it('reports configured web access without claiming compiler or database health', function () {
    render(
      <UnderleafSystemPage
        data={{
          ...guest,
          kind: 'status',
          code: undefined,
          title: 'Installation status',
          status: {
            checkedAt: '2026-10-05T12:00:00.000Z',
            uptimeSeconds: 42,
            shuttingDown: true,
            siteOpen: true,
            editorOpen: false,
          },
        }}
      />
    )
    const main = screen.getByRole('main')
    expect(within(main).getByText('Shutting down')).to.exist
    expect(within(main).getByText('Available')).to.exist
    expect(within(main).getByText('Closed')).to.exist
    expect(within(main).getByText('42')).to.exist
    expect(main.querySelector('time')?.getAttribute('datetime')).to.equal(
      '2026-10-05T12:00:00.000Z'
    )
    expect(within(main).queryByText('MongoDB healthy')).to.be.null
    expect(within(main).queryByText('Compiler healthy')).to.be.null
  })

  it('cancels logout without submitting or clearing editor backups', async function () {
    const backups = sinon.stub(OfflineDocBackup, 'clearAll')
    const outages = sinon.stub(ConnectionOutageTracker, 'clearAll')
    render(
      <UnderleafSystemPage
        data={{
          ...guest,
          kind: 'logout',
          code: undefined,
          signedIn: true,
          title: 'Log out of Underleaf?',
          backPath: '/project',
          backLabel: 'Back to your projects',
        }}
      />
    )
    const form = screen
      .getByRole('button', { name: 'Log out' })
      .closest('form')!
    const submissions = sinon.spy()
    form.addEventListener('submit', event => {
      event.preventDefault()
      submissions()
    })
    expect(form.getAttribute('method')).to.equal('POST')
    expect(form.getAttribute('action')).to.equal('/logout')
    expect(
      form.querySelector<HTMLInputElement>('input[name="_csrf"]')?.value
    ).to.equal('test-csrf')
    const cancel = screen.getByRole('link', { name: 'Cancel' })
    expect(cancel.getAttribute('href')).to.equal('/project')
    cancel.addEventListener('click', event => event.preventDefault())
    await userEvent.click(cancel)
    expect(submissions.called).to.equal(false)
    expect(backups.called).to.equal(false)
    expect(outages.called).to.equal(false)
  })

  it('keeps a saved Light preference authoritative on system pages', function () {
    window.metaAttributesCache.set('ol-user_id', 'account-id')
    window.metaAttributesCache.set('ol-userSettings', {
      overallTheme: 'light-',
    })
    render(<UnderleafSystemPage data={guest} />)
    expect(document.body.dataset.theme).to.equal('light')
    expect(
      (screen.getByRole('radio', { name: 'Light' }) as HTMLInputElement).checked
    ).to.equal(true)
    expect(
      screen.getByRole('img', { name: 'Underleaf' }).getAttribute('src')
    ).to.equal('/underleaf-lockup.svg')
  })
})
