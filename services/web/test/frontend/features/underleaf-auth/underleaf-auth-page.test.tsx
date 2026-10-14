import { act, cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect } from 'chai'
import sinon from 'sinon'
import fetchMock from 'fetch-mock'
import UnderleafAuthPage from '@/features/underleaf-auth/components/underleaf-auth-page'

describe('<UnderleafAuthPage />', function () {
  let previousMeta: typeof window.metaAttributesCache

  beforeEach(function () {
    previousMeta = window.metaAttributesCache
    window.metaAttributesCache = new Map() as typeof window.metaAttributesCache
    window.metaAttributesCache.set('ol-ExposedSettings', {
      appName: 'Underleaf',
      underleaf: true,
    })
    window.metaAttributesCache.set('ol-navbar', { items: [] })
    window.metaAttributesCache.set('ol-csrfToken', 'test-csrf')
    localStorage.clear()
  })

  afterEach(function () {
    cleanup()
    sinon.restore()
    fetchMock.removeRoutes().clearHistory()
    window.metaAttributesCache = previousMeta
    localStorage.clear()
  })

  async function administrator() {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'Get started' }))
    await user.type(screen.getByLabelText('Username'), 'first-admin')
    await user.type(
      screen.getByLabelText('Password', { exact: true }),
      'strong-bootstrap-secret'
    )
    await user.type(
      screen.getByLabelText('Confirm password'),
      'strong-bootstrap-secret'
    )
    return user
  }

  it('uses the shared shell, ordered setup steps and theme choices', function () {
    render(<UnderleafAuthPage page="welcome" />)
    expect(screen.getByRole('heading', { name: 'Welcome to Underleaf' })).to
      .exist
    expect(
      screen
        .getAllByRole('listitem')
        .map(item => item.textContent?.replace(/[●○✓]/g, '').trim())
    ).to.deep.equal(['Welcome', 'Administrator', 'Ready'])
    expect(screen.getByRole('radio', { name: 'System' })).to.exist
    expect(screen.queryByRole('link', { name: 'Administration' })).to.be.null
  })

  it('submits credentials with CSRF, shows Ready and opens projects automatically', async function () {
    fetchMock.post('/welcome', { redir: '/project' })
    const navigate = sinon.stub()
    render(<UnderleafAuthPage page="welcome" navigate={navigate} />)
    const user = await administrator()
    await user.click(
      screen.getByRole('button', { name: 'Create administrator' })
    )
    expect(
      await screen.findByRole('heading', {
        name: 'Your installation is ready',
      })
    ).to.exist
    expect(screen.queryByLabelText('Password', { exact: true })).to.be.null
    const call = fetchMock.callHistory.lastCall('/welcome')!
    expect(call.options.headers).to.include({ 'x-csrf-token': 'test-csrf' })
    expect(JSON.parse(call.options.body as string)).to.include({
      username: 'first-admin',
      confirmPassword: 'strong-bootstrap-secret',
    })
    await act(() => new Promise(resolve => setTimeout(resolve, 1300)))
    expect(navigate.calledOnceWithExactly('/project')).to.equal(true)
  })

  it('rejects password mismatch before making a request', async function () {
    render(<UnderleafAuthPage page="welcome" />)
    const user = await administrator()
    await user.type(screen.getByLabelText('Confirm password'), 'different')
    await user.click(
      screen.getByRole('button', { name: 'Create administrator' })
    )
    expect(screen.getByRole('alert').textContent).to.equal(
      'The passwords do not match.'
    )
    expect(fetchMock.callHistory.called('/welcome')).to.equal(false)
  })

  it('offers Login when another request has already initialized the installation', async function () {
    fetchMock.post('/welcome', { status: 409, body: { code: 'setup_closed' } })
    render(<UnderleafAuthPage page="welcome" />)
    const user = await administrator()
    await user.click(
      screen.getByRole('button', { name: 'Create administrator' })
    )
    expect(
      await screen.findByRole('link', { name: 'Log in' })
    ).to.have.property('href', 'http://localhost/login')
    expect(screen.queryByRole('button', { name: 'Create administrator' })).to.be
      .null
  })

  it('offers Login after initialization succeeds but automatic login fails', async function () {
    fetchMock.post('/welcome', {
      status: 503,
      body: { code: 'setup_login_failed' },
    })
    render(<UnderleafAuthPage page="welcome" />)
    const user = await administrator()
    await user.click(
      screen.getByRole('button', { name: 'Create administrator' })
    )
    expect(await screen.findByRole('link', { name: 'Log in' })).to.exist
    expect(screen.getByRole('alert').textContent).to.include(
      'administrator account was created'
    )
  })

  it('preserves login redirects and uses username instead of email', async function () {
    fetchMock.post('/login', { redir: '/project/example' })
    const navigate = sinon.stub()
    render(<UnderleafAuthPage page="login" navigate={navigate} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Username'), 'existing-user')
    await user.type(screen.getByLabelText('Password'), 'existing-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect(navigate.calledOnceWithExactly('/project/example')).to.equal(true)
    expect(screen.queryByLabelText('Email')).to.be.null
    expect(screen.getByRole('heading', { name: 'Welcome back' })).to.exist
  })

  it('explains an expired session and keeps recovery in the username login form', function () {
    render(<UnderleafAuthPage page="login" sessionExpired />)
    expect(screen.getByRole('status').textContent).to.include('session expired')
    expect(screen.getByLabelText('Username')).to.exist
    expect(screen.queryByLabelText('Email')).to.be.null
    expect(document.querySelector('a[href="/forgot-password"]')).to.be.null
  })

  it('shows inherited login errors returned with HTTP 200', async function () {
    fetchMock.post('/login', {
      message: { type: 'error', text: 'Invalid username or password.' },
    })
    const navigate = sinon.stub()
    render(<UnderleafAuthPage page="login" navigate={navigate} />)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('Username'), 'existing-user')
    await user.type(screen.getByLabelText('Password'), 'incorrect-password')
    await user.click(screen.getByRole('button', { name: 'Log in' }))
    expect((await screen.findByRole('alert')).textContent).to.equal(
      'Invalid username or password.'
    )
    expect(navigate.called).to.equal(false)
  })
})
