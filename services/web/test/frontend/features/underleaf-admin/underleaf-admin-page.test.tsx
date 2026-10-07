import {
  cleanup,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'chai'
import fetchMock from 'fetch-mock'
import UnderleafAdminPage from '@/features/underleaf-admin/components/underleaf-admin-page'
import type { UnderleafAdminUser } from '../../../../types/underleaf-admin'

const administrator: UnderleafAdminUser = {
  id: '000000000000000000000001',
  username: 'administrator',
  displayName: 'Local Admin',
  role: 'admin',
  status: 'active',
  projectCount: 0,
  createdAt: null,
  lastLoginAt: null,
}
const account: UnderleafAdminUser = {
  id: '000000000000000000000002',
  username: 'alice',
  displayName: 'Alice Example',
  role: 'user',
  status: 'active',
  projectCount: 3,
  createdAt: null,
  lastLoginAt: null,
}

describe('<UnderleafAdminPage />', function () {
  let previousMeta: typeof window.metaAttributesCache
  beforeEach(function () {
    previousMeta = window.metaAttributesCache
    window.metaAttributesCache = new Map([
      [
        'ol-ExposedSettings',
        { appName: 'Underleaf', ieeeBrandId: 1234, underleaf: true },
      ],
      ['ol-navbar', { items: [], canDisplayAdminMenu: true }],
      ['ol-user_id', administrator.id],
      ['ol-userSettings', { overallTheme: 'light-' }],
      ['ol-csrfToken', 'test-csrf'],
    ])
  })
  afterEach(function () {
    cleanup()
    fetchMock.removeRoutes().clearHistory()
    window.metaAttributesCache = previousMeta
  })
  function users() {
    render(
      <UnderleafAdminPage
        data={{
          page: 'users',
          users: [administrator, account],
          currentUserId: administrator.id,
          notice: '',
          error: '',
        }}
      />
    )
    return userEvent.setup()
  }

  async function openActions(
    user: ReturnType<typeof userEvent.setup>,
    username: string
  ) {
    await user.click(
      screen.getByRole('button', { name: `Actions: ${username}` })
    )
  }

  it('renders overview counts and administrative navigation in the shared shell', function () {
    render(
      <UnderleafAdminPage
        data={{
          page: 'overview',
          stats: {
            userCount: 8,
            activeUsers: 6,
            adminUsers: 2,
            projectCount: 12,
          },
        }}
      />
    )
    expect(screen.getByRole('heading', { name: 'Administration' })).to.exist
    expect(
      screen
        .getByRole('link', { name: 'Administration' })
        .getAttribute('aria-current')
    ).to.equal('page')
    expect(
      screen.getByRole('radio', { name: 'Light', exact: true })
    ).to.have.property('checked', true)
    expect(
      screen.getByRole('link', { name: /Create accounts/ })
    ).to.have.property('href', 'http://localhost/admin/users')
    expect(
      screen.getByRole('link', { name: /Check the web process/ })
    ).to.have.property('href', 'http://localhost/status')
    expect(document.querySelector('.underleaf-admin-stats')?.textContent).to.include(
      'Active projects12'
    )
  })

  it('keeps the table read-only, searchable and protects the current administrator', async function () {
    const user = users()
    const table = screen.getByRole('table')
    expect(within(table).queryByRole('textbox')).to.be.null
    expect(within(table).queryByRole('combobox')).to.be.null
    await openActions(user, 'administrator')
    expect(
      screen.getByRole('button', { name: 'Disable user: administrator' })
    ).to.have.property('disabled', true)
    expect(
      screen.getByRole('button', { name: 'Delete user: administrator' })
    ).to.have.property('disabled', true)
    await user.type(screen.getByLabelText('Search users'), 'Alice Example')
    expect(within(table).queryByText('administrator')).to.be.null
    expect(within(table).getByText('alice')).to.exist
  })

  it('creates a user with CSRF and updates the table after success', async function () {
    const created = {
      ...account,
      id: '000000000000000000000003',
      username: 'bravo',
      displayName: 'Bravo',
      projectCount: 0,
    }
    fetchMock.post('/admin/users', {
      status: 201,
      body: { user: created, message: 'User created.' },
    })
    const user = users()
    await user.click(screen.getByRole('button', { name: 'Create user' }))
    const modal = screen.getByRole('dialog')
    await user.type(within(modal).getByLabelText('Username'), 'bravo')
    await user.type(within(modal).getByLabelText('Display name'), 'Bravo')
    await user.type(
      within(modal).getByLabelText('Password', { exact: true }),
      'strong-secret'
    )
    await user.type(
      within(modal).getByLabelText('Confirm password'),
      'strong-secret'
    )
    await user.click(within(modal).getByRole('button', { name: 'Create user' }))
    expect(await screen.findByText('bravo')).to.exist
    const call = fetchMock.callHistory.lastCall('/admin/users')!
    expect(call.options.headers).to.include({ 'x-csrf-token': 'test-csrf' })
    expect(JSON.parse(call.options.body as string)).to.deep.equal({
      username: 'bravo',
      displayName: 'Bravo',
      role: 'user',
      password: 'strong-secret',
      confirmPassword: 'strong-secret',
    })
  })

  it('edits identity and role without sending status or password', async function () {
    const path = `/admin/users/${account.id}`
    fetchMock.post(path, {
      user: { ...account, username: 'alice-new' },
      message: 'User updated.',
    })
    const user = users()
    await openActions(user, 'alice')
    await user.click(screen.getByRole('button', { name: 'Edit user: alice' }))
    const modal = screen.getByRole('dialog')
    await user.clear(within(modal).getByLabelText('Username'))
    await user.type(within(modal).getByLabelText('Username'), 'alice-new')
    await user.click(within(modal).getByRole('button', { name: 'Save' }))
    expect(await screen.findByText('alice-new')).to.exist
    expect(
      JSON.parse(fetchMock.callHistory.lastCall(path)!.options.body as string)
    ).to.deep.equal({
      username: 'alice-new',
      displayName: 'Alice Example',
      role: 'user',
    })
  })

  it('requires matching passwords and sends only the reset payload', async function () {
    const path = `/admin/users/${account.id}/password`
    fetchMock.post(path, { user: account, message: 'Password reset.' })
    const user = users()
    await openActions(user, 'alice')
    await user.click(
      screen.getByRole('button', { name: 'Reset password: alice' })
    )
    const modal = screen.getByRole('dialog')
    await user.type(
      within(modal).getByLabelText('Password', { exact: true }),
      'new-strong-secret'
    )
    await user.type(
      within(modal).getByLabelText('Confirm password'),
      'different-secret'
    )
    await user.click(
      within(modal).getByRole('button', { name: 'Reset password' })
    )
    expect(fetchMock.callHistory.called(path)).to.equal(false)
    expect(within(modal).getByRole('alert').textContent).to.equal(
      'The passwords do not match.'
    )
    await user.clear(within(modal).getByLabelText('Confirm password'))
    await user.type(
      within(modal).getByLabelText('Confirm password'),
      'new-strong-secret'
    )
    await user.click(
      within(modal).getByRole('button', { name: 'Reset password' })
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).to.be.null)
    expect(
      JSON.parse(fetchMock.callHistory.lastCall(path)!.options.body as string)
    ).to.deep.equal({
      password: 'new-strong-secret',
      confirmPassword: 'new-strong-secret',
    })
  })

  it('confirms disabling, surfaces a rejected operation and keeps account data', async function () {
    const path = `/admin/users/${account.id}/status`
    fetchMock.post(path, {
      status: 409,
      body: {
        code: 'last_admin',
        message: 'The last active administrator cannot be disabled.',
      },
    })
    const user = users()
    await openActions(user, 'alice')
    await user.click(
      screen.getByRole('button', { name: 'Disable user: alice' })
    )
    expect(fetchMock.callHistory.called(path)).to.equal(false)
    const modal = screen.getByRole('dialog')
    await user.click(
      within(modal).getByRole('button', { name: 'Disable user' })
    )
    expect(await within(modal).findByRole('alert')).to.exist
    expect(
      within(screen.getByRole('table')).getAllByText('Active')
    ).to.have.length(2)
  })

  it('requires explicit project deletion and DELETE; cancellation sends no request', async function () {
    const path = `/admin/users/${account.id}/delete`
    fetchMock.post(path, {
      id: account.id,
      message: 'User and all owned projects deleted.',
    })
    const user = users()
    await openActions(user, 'alice')
    await user.click(screen.getByRole('button', { name: 'Delete user: alice' }))
    let modal = screen.getByRole('dialog')
    await user.type(
      within(modal).getByLabelText('Type DELETE to confirm'),
      'DELETE'
    )
    expect(
      within(modal).getByRole('button', { name: 'Delete user' })
    ).to.have.property('disabled', true)
    await user.click(within(modal).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).to.be.null)
    expect(fetchMock.callHistory.called(path)).to.equal(false)
    await openActions(user, 'alice')
    await user.click(screen.getByRole('button', { name: 'Delete user: alice' }))
    modal = screen.getByRole('dialog')
    expect(within(modal).getByRole('alert').textContent).to.include(
      'Owned projects: 3'
    )
    await user.selectOptions(
      within(modal).getByLabelText('Account and owned projects'),
      'delete'
    )
    expect(
      within(modal).getByRole('button', { name: 'Delete user' })
    ).to.have.property('disabled', true)
    await user.type(
      within(modal).getByLabelText('Type DELETE to confirm'),
      'DELETE'
    )
    await user.click(within(modal).getByRole('button', { name: 'Delete user' }))
    await waitFor(
      () =>
        expect(within(screen.getByRole('table')).queryByText('alice')).to.be
          .null
    )
    expect(
      JSON.parse(fetchMock.callHistory.lastCall(path)!.options.body as string)
    ).to.deep.equal({ confirm: 'DELETE', projectAction: 'delete' })
  })
})
