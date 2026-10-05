import { expect } from 'chai'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import fetchMock from 'fetch-mock'
import AccountInfoSection from '@/features/settings/components/account-info-section'
import { UserProvider } from '@/shared/context/user-context'

function renderSection() {
  render(
    <UserProvider>
      <AccountInfoSection />
    </UserProvider>
  )
}
describe('<AccountInfoSection /> username profile', function () {
  beforeEach(function () {
    window.metaAttributesCache.set('ol-user', {
      id: 'account-id',
      username: 'lucas',
      displayName: 'Lucas Collevatti',
    })
  })
  afterEach(function () {
    cleanup()
    fetchMock.removeRoutes().clearHistory()
  })
  it('keeps username read-only and sends only the trimmed display name', async function () {
    fetchMock.post('/user/settings', 200)
    renderSection()
    expect(screen.getByLabelText('Username')).to.have.property('readOnly', true)
    expect(screen.queryByLabelText('Email')).to.be.null
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: ' New name ' },
    })
    await userEvent.click(screen.getByRole('button', { name: 'Update' }))
    await waitFor(
      () =>
        expect(
          fetchMock.callHistory.called('/user/settings', {
            body: { displayName: 'New name' },
          })
        ).to.be.true
    )
    await screen.findByText('Thanks, your settings have been updated.')
  })
  it('does not submit an empty name', async function () {
    fetchMock.post('/user/settings', 200)
    renderSection()
    fireEvent.change(screen.getByLabelText('Display name'), {
      target: { value: '  ' },
    })
    expect(screen.getByRole('button', { name: 'Update' })).to.have.property(
      'disabled',
      true
    )
    expect(fetchMock.callHistory.called('/user/settings')).to.be.false
  })
  it('shows a server failure while leaving the name editable', async function () {
    fetchMock.post('/user/settings', 500)
    renderSection()
    await userEvent.click(screen.getByRole('button', { name: 'Update' }))
    await screen.findByText('Something went wrong. Please try again.')
    expect(screen.getByLabelText('Display name')).to.have.property(
      'readOnly',
      false
    )
  })
})
