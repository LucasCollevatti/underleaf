import { beforeEach, describe, expect, it, vi } from 'vitest'
import Controller from '../../../../app/src/Features/Underleaf/UnderleafWelcomeController.mjs'
import Installation from '../../../../app/src/Features/Underleaf/UnderleafInstallationManager.mjs'
import Authentication from '../../../../app/src/Features/Authentication/AuthenticationController.mjs'
import { UnderleafUserError } from '../../../../app/src/Features/Underleaf/UnderleafUserManager.mjs'

vi.mock(
  '../../../../app/src/Features/Underleaf/UnderleafInstallationManager.mjs',
  () => ({
    default: { getState: vi.fn(), initialize: vi.fn() },
  })
)
vi.mock(
  '../../../../app/src/Features/Authentication/AuthenticationController.mjs',
  () => ({
    default: {
      _clearRedirectFromSession: vi.fn(),
      setAuditInfo: vi.fn(),
      promises: { finishLogin: vi.fn() },
    },
  })
)
vi.mock(
  '../../../../app/src/Features/Underleaf/UnderleafUserManager.mjs',
  () => ({
    UnderleafUserError: class extends Error {
      constructor(code) {
        super(code)
        this.code = code
      }
    },
  })
)

describe('UnderleafWelcomeController', function () {
  let req, res, next
  beforeEach(function () {
    vi.clearAllMocks()
    req = {
      method: 'GET',
      session: {},
      body: {
        username: 'first-admin',
        displayName: 'Administrator',
        password: 'strong-bootstrap-secret',
        confirmPassword: 'strong-bootstrap-secret',
      },
    }
    res = {
      set: vi.fn(),
      render: vi.fn(),
      redirect: vi.fn(),
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      headersSent: false,
    }
    next = vi.fn()
    Installation.getState.mockResolvedValue({ initialized: false })
    Installation.initialize.mockResolvedValue({
      _id: 'first-admin-id',
      isAdmin: true,
    })
    Authentication.promises.finishLogin.mockResolvedValue(undefined)
  })

  it('renders fresh setup with caching disabled', async function () {
    await Controller.welcome(req, res, next)
    expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store')
    expect(res.render).toHaveBeenCalledWith(
      'underleaf/auth',
      expect.objectContaining({ authPage: 'welcome' })
    )
  })

  it('redirects initialized visitors to Login and authenticated users to Projects', async function () {
    Installation.getState.mockResolvedValue({ initialized: true })
    await Controller.welcome(req, res, next)
    expect(res.redirect).toHaveBeenLastCalledWith('/login')
    req.session.passport = {
      user: {
        _id: 'admin-id',
        username: 'admin',
        role: 'admin',
        status: 'active',
        identityVersion: 1,
      },
    }
    await Controller.welcome(req, res, next)
    expect(res.redirect).toHaveBeenLastCalledWith('/project')
  })

  it('rejects mismatched passwords before touching persistent state', async function () {
    req.body.confirmPassword = 'different-password'
    await Controller.initialize(req, res, next)
    expect(res.status).toHaveBeenCalledWith(400)
    expect(res.json).toHaveBeenCalledWith({ code: 'password_mismatch' })
    expect(Installation.initialize).not.toHaveBeenCalled()
  })

  it.each([
    { role: 'admin' },
    { isAdmin: true },
    { password: 123 },
    { username: 'a' },
    { displayName: 'x'.repeat(256) },
  ])(
    'rejects invalid input and privilege fields: %j',
    async function (invalid) {
      Object.assign(req.body, invalid)
      await Controller.initialize(req, res, next)
      expect(next).toHaveBeenCalledWith(expect.any(Error))
      expect(Installation.initialize).not.toHaveBeenCalled()
    }
  )

  it('uses the standard login only after successful initialization', async function () {
    await Controller.initialize(req, res, next)
    expect(Installation.initialize).toHaveBeenCalledWith({
      username: 'first-admin',
      displayName: 'Administrator',
      password: 'strong-bootstrap-secret',
    })
    expect(Authentication._clearRedirectFromSession).toHaveBeenCalledWith(req)
    expect(Authentication.setAuditInfo).toHaveBeenCalledWith(req, {
      method: 'First administrator setup',
    })
    expect(Authentication.promises.finishLogin).toHaveBeenCalledWith(
      { _id: 'first-admin-id', isAdmin: true },
      req,
      res
    )
    expect(Installation.initialize.mock.invocationCallOrder[0]).toBeLessThan(
      Authentication.promises.finishLogin.mock.invocationCallOrder[0]
    )
  })

  it('rejects closed setup without attempting login', async function () {
    Installation.initialize.mockRejectedValue(
      new UnderleafUserError('setup_closed')
    )
    await Controller.initialize(req, res, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({ code: 'setup_closed' })
    expect(Authentication.promises.finishLogin).not.toHaveBeenCalled()
  })

  it('propagates storage failure without attempting login', async function () {
    const error = new Error('storage unavailable')
    Installation.initialize.mockRejectedValue(error)
    await Controller.initialize(req, res, next)
    expect(next).toHaveBeenCalledWith(error)
    expect(Authentication.promises.finishLogin).not.toHaveBeenCalled()
  })

  it('offers normal login when session setup fails after initialization', async function () {
    Authentication.promises.finishLogin.mockRejectedValue(
      new Error('session store unavailable')
    )
    await Controller.initialize(req, res, next)
    expect(Installation.initialize).toHaveBeenCalledTimes(1)
    expect(res.status).toHaveBeenCalledWith(503)
    expect(res.json).toHaveBeenCalledWith({ code: 'setup_login_failed' })
  })

  it('gates fresh pages and mutations but allows initialized requests', async function () {
    await Controller.requireInitialized(req, res, next)
    expect(res.redirect).toHaveBeenCalledWith('/welcome')
    req.method = 'POST'
    await Controller.requireInitialized(req, res, next)
    expect(res.status).toHaveBeenCalledWith(409)
    expect(res.json).toHaveBeenCalledWith({
      code: 'installation_not_initialized',
    })
    Installation.getState.mockResolvedValue({ initialized: true })
    await Controller.requireInitialized(req, res, next)
    expect(next).toHaveBeenCalledTimes(1)
  })
})
