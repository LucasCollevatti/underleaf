import { expect } from 'chai'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import SettingsPageRoot from '@/features/settings/components/root'
import getMeta from '@/utils/meta'

describe('<SettingsPageRoot /> local Underleaf accounts', function () {
  beforeEach(function () {
    Object.assign(getMeta('ol-ExposedSettings'), {
      underleaf: true,
      isOverleaf: true,
      labsEnabled: true,
      hasAffiliationsFeature: true,
      enableSubscriptions: true,
    })
    window.metaAttributesCache.set('ol-navbar', { items: [] })
    window.metaAttributesCache.set('ol-user_id', 'account-id')
    window.metaAttributesCache.set('ol-user', {
      id: 'account-id',
      username: 'lucas',
      displayName: 'Lucas',
      role: 'user',
      status: 'active',
    })
    window.metaAttributesCache.set('ol-hasPassword', true)
    window.metaAttributesCache.set('ol-userSettings', {
      overallTheme: 'system',
    })
    window.metaAttributesCache.set('ol-passwordStrengthOptions', {})
  })
  afterEach(function () {
    cleanup()
    fetchMock.removeRoutes().clearHistory()
    localStorage.clear()
  })
  it('shows local account controls in the same sidebar shell', async function () {
    render(<SettingsPageRoot />)
    await screen.findByRole('heading', { name: 'Account settings' })
    expect(screen.getByRole('link', { name: 'Projects' })).to.exist
    expect(screen.getByRole('img', { name: 'Underleaf' })).to.exist
    expect(screen.getByLabelText('Username')).to.have.property('value', 'lucas')
    expect(screen.getByLabelText('Display name')).to.have.property(
      'value',
      'Lucas'
    )
    expect(screen.getByRole('heading', { name: 'Change password' })).to.exist
    expect(screen.getByRole('link', { name: 'Manage sessions' })).to.exist
    const appearance = screen.getByRole('region', { name: 'Appearance' })
    for (const name of ['System', 'Light', 'Dark'])
      expect(within(appearance).getByRole('radio', { name })).to.exist
  })
  it('omits SaaS account sections even if inherited flags are enabled', async function () {
    render(<SettingsPageRoot />)
    await screen.findByRole('heading', { name: 'Account settings' })
    for (const name of ['Email', 'First name', 'Last name', 'Institution'])
      expect(screen.queryByLabelText(name)).to.be.null
    for (const name of [
      'Emails and affiliations',
      'Newsletter',
      'Overleaf beta program',
      'Subscription',
    ])
      expect(screen.queryByText(name)).to.be.null
    expect(screen.queryByRole('button', { name: 'Delete your account' })).to.be
      .null
  })
  it('saves the same appearance choice from Settings and the sidebar', async function () {
    fetchMock.post('/user/settings', 200)
    render(<SettingsPageRoot />)
    await screen.findByRole('heading', { name: 'Appearance' })
    const appearance = screen.getByRole('region', { name: 'Appearance' })
    await userEvent.click(
      within(appearance).getByRole('radio', { name: 'Light' })
    )
    expect(
      fetchMock.callHistory.called('/user/settings', {
        body: { overallTheme: 'light-' },
      })
    ).to.be.true
    for (const radio of screen.getAllByRole('radio', { name: 'Light' }))
      expect(radio).to.have.property('checked', true)
  })
})
