import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  settings: {
    underleaf: true,
    siteUrl: 'http://underleaf.test',
    httpAuthUsers: { internal: 'secret' },
  },
  authenticate: vi.fn(),
  findById: vi.fn(),
  hooks: vi.fn(),
  audit: vi.fn(),
  quota: vi.fn(),
  update: vi.fn(),
  track: vi.fn(),
  redirect: vi.fn(),
  maintenance: vi.fn(),
  metrics: vi.fn(),
  passportAuthenticate: vi.fn(),
}))
vi.mock('@overleaf/settings', () => ({ default: mocks.settings }))
vi.mock('@overleaf/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    err: vi.fn(),
    error: vi.fn(),
  },
}))
vi.mock('@overleaf/metrics', () => ({ default: { inc: mocks.metrics } }))
vi.mock('passport', () => ({
  default: { authenticate: mocks.passportAuthenticate },
}))
vi.mock('../../../../app/src/models/User.mjs', () => ({
  User: { findById: mocks.findById },
}))
vi.mock(
  '../../../../app/src/Features/Underleaf/UnderleafUserManager.mjs',
  () => ({ default: { authenticate: mocks.authenticate } })
)
vi.mock('../../../../app/src/Features/User/UserUpdater.mjs', () => ({
  default: { updateUser: mocks.update },
}))
vi.mock('../../../../app/src/Features/User/UserSessionsManager.mjs', () => ({
  default: { trackSession: mocks.track },
}))
vi.mock('../../../../app/src/Features/User/UserAuditLogHandler.mjs', () => ({
  default: { promises: { addEntry: mocks.audit } },
}))
vi.mock('../../../../app/src/Features/Security/LoginRateLimiter.mjs', () => ({
  default: { recordSuccessfulLogin: mocks.quota },
}))
vi.mock('../../../../app/src/Features/Analytics/AnalyticsManager.mjs', () => ({
  default: {
    recordEventForMongoUserInBackground: vi.fn(),
    identifyUser: vi.fn(),
  },
}))
vi.mock(
  '../../../../app/src/Features/Analytics/AnalyticsRegistrationSourceHelper.mjs',
  () => ({ default: { clearSource: vi.fn(), clearInbound: vi.fn() } })
)
vi.mock(
  '../../../../app/src/Features/Notifications/NotificationsBuilder.mjs',
  () => ({ default: {} })
)
vi.mock('../../../../app/src/Features/Helpers/AsyncFormHelper.mjs', () => ({
  default: { redirect: mocks.redirect },
}))
vi.mock(
  '../../../../app/src/Features/Helpers/AdminAuthorizationHelper.mjs',
  () => ({ default: { hasAdminAccess: user => Boolean(user?.isAdmin) } })
)
vi.mock('../../../../app/src/infrastructure/Modules.mjs', () => ({
  default: { promises: { hooks: { fire: mocks.hooks } } },
}))
vi.mock('../../../../app/src/Features/SplitTests/SplitTestHandler.mjs', () => ({
  default: { promises: { userMaintenanceOnLogin: mocks.maintenance } },
}))

import Authentication from '../../../../app/src/Features/Authentication/AuthenticationController.mjs'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'

function account() {
  return {
    _id: 'account-id',
    username: 'alpha',
    displayName: 'Alpha',
    role: 'user',
    status: 'active',
    identityVersion: 1,
    analyticsId: 'analytics-id',
  }
}
function deserialize(user) {
  return new Promise((resolve, reject) =>
    Authentication.deserializeUser(user, (error, current) =>
      error ? reject(error) : resolve(current)
    )
  )
}
function response() {
  const res = {
    setHeader: vi.fn(),
    sendStatus: vi.fn(),
    redirect: vi.fn(),
    status: vi.fn(),
    json: vi.fn(),
  }
  res.status.mockReturnValue(res)
  return res
}

beforeEach(() => {
  vi.clearAllMocks()
  mocks.hooks.mockResolvedValue([])
  mocks.audit.mockResolvedValue(undefined)
  mocks.maintenance.mockResolvedValue(undefined)
  mocks.update.mockImplementation((id, update, callback) => callback?.())
  mocks.quota.mockImplementation((username, callback) => callback?.())
  mocks.track.mockImplementation((user, sessionId, callback) => callback?.())
  mocks.authenticate.mockResolvedValue({ user: account(), reason: null })
})

describe('AuthenticationController username identity', () => {
  it('serializes canonical identity without email or password credentials', () => {
    const callback = vi.fn()
    Authentication.serializeUser(
      {
        ...account(),
        email: 'old@example.org',
        emails: [],
        passwordHash: 'secret-hash',
      },
      callback
    )
    const result = callback.mock.calls[0][1]
    expect(result).toMatchObject({
      username: 'alpha',
      displayName: 'Alpha',
      identityVersion: 1,
    })
    for (const key of [
      'email',
      'emails',
      'password',
      'passwordHash',
      'hashedPassword',
    ])
      expect(result).not.toHaveProperty(key)
  })
  it('refuses serialization without username', () => {
    const callback = vi.fn()
    Authentication.serializeUser(
      { _id: 'id', email: 'old@example.org' },
      callback
    )
    expect(callback.mock.calls[0][0]).toBeInstanceOf(Error)
  })
  it.each([
    undefined,
    { _id: 'id' },
    { ...account(), identityVersion: undefined },
  ])('rejects pre-migration sessions: %j', async user => {
    expect(await deserialize(user)).toBe(false)
    expect(mocks.findById).not.toHaveBeenCalled()
  })
  it.each([
    null,
    { ...account(), status: 'disabled' },
    { ...account(), identityVersion: 2 },
  ])('rejects deleted, disabled or revoked identities: %j', async current => {
    mocks.findById.mockReturnValue({
      lean: () => ({ exec: async () => current }),
    })
    expect(await deserialize(account())).toBe(false)
  })
  it('refreshes the actual stored session used by requireLogin and frontend metadata', async () => {
    const stored = {
      ...account(),
      displayName: 'Old name',
      email: 'old@example.org',
    }
    mocks.findById.mockReturnValue({
      lean: () => ({
        exec: async () => ({ ...account(), displayName: 'New name' }),
      }),
    })
    const current = await deserialize(stored)
    expect(current).toBe(stored)
    expect(stored.displayName).toBe('New name')
    expect(stored).not.toHaveProperty('email')
    const req = { session: { passport: { user: stored } } },
      next = vi.fn()
    Authentication.requireLogin()(req, response(), next)
    expect(next).toHaveBeenCalledOnce()
    expect(req.user.displayName).toBe('New name')
    expect(SessionManager.getSessionUser(req.session)).toBe(current)
  })
  it('propagates database errors when refreshing a session', async () => {
    const error = new Error('Database unavailable')
    mocks.findById.mockReturnValue({
      lean: () => ({
        exec: async () => {
          throw error
        },
      }),
    })
    await expect(deserialize(account())).rejects.toBe(error)
  })
  it('passes the username to the canonical account manager', async () => {
    const result = await Authentication._doPassportLogin(
      {},
      ' ALPHA ',
      'local-secret'
    )
    expect(mocks.authenticate).toHaveBeenCalledWith(' ALPHA ', 'local-secret')
    expect(result.user.username).toBe('alpha')
  })
  it.each([
    ['invalid_credentials', 401],
    ['disabled', 403],
  ])('returns the expected rejection for %s', async (reason, status) => {
    mocks.authenticate.mockResolvedValue({ user: null, reason })
    const result = await Authentication._doPassportLogin(
      {},
      'alpha',
      'wrong-secret'
    )
    expect(result.user).toBe(false)
    expect(result.info.status).toBe(status)
  })
  it('sends unauthenticated JSON requests a 401 challenge', () => {
    const res = response()
    Authentication.requireLogin()(
      { session: {}, accepts: () => 'json' },
      res,
      vi.fn()
    )
    expect(res.sendStatus).toHaveBeenCalledWith(401)
    expect(res.setHeader).toHaveBeenCalledWith(
      'WWW-Authenticate',
      'OverleafLogin'
    )
  })
  it('redirects anonymous visitors to login without offering signup', () => {
    const req = {
      session: {},
      query: { zipUrl: 'https://example.org/project.zip' },
      path: '/project',
      url: '/project',
      accepts: () => 'html',
    }
    const res = response()
    Authentication.requireLogin()(req, res, vi.fn())
    expect(res.redirect.mock.calls[0][0]).toMatch(/^\/login\?/)
  })
  it('finishes login with username device history, a new CSRF secret and tracked session', async () => {
    const user = account(),
      res = response()
    const req = {
      session: {
        csrfSecret: 'old-secret',
        __tmp: true,
        save: callback => callback(),
      },
      sessionID: 'new-session',
      ip: '127.0.0.1',
      res,
      login: vi.fn((user, options, callback) => callback()),
      deviceHistory: {
        add: vi.fn(),
        serialize: vi.fn().mockResolvedValue(undefined),
      },
    }
    await Authentication.promises.finishLogin(user, req, res)
    expect(req.session).not.toHaveProperty('csrfSecret')
    expect(req.deviceHistory.add).toHaveBeenCalledWith('alpha')
    expect(mocks.quota).toHaveBeenCalledWith('alpha', expect.any(Function))
    expect(mocks.track).toHaveBeenCalledWith(
      user,
      'new-session',
      expect.any(Function)
    )
    expect(mocks.redirect).toHaveBeenCalledWith(req, res, '/project')
  })
  it('honors private API credentials independently of user identity', () => {
    const next = vi.fn(),
      res = response()
    Authentication.requirePrivateApiAuth()(
      {
        headers: {
          authorization:
            'Basic ' + Buffer.from('internal:secret').toString('base64'),
        },
      },
      res,
      next
    )
    expect(next).toHaveBeenCalledOnce()
    expect(res.sendStatus).not.toHaveBeenCalled()
  })
  it('rejects invalid private API credentials', () => {
    const next = vi.fn(),
      res = response()
    Authentication.requirePrivateApiAuth()(
      {
        headers: {
          authorization:
            'Basic ' + Buffer.from('internal:wrong').toString('base64'),
        },
      },
      res,
      next
    )
    expect(next).not.toHaveBeenCalled()
    expect(res.sendStatus).toHaveBeenCalledWith(401)
  })
  it.each([
    ['secret', 'secret', true],
    ['secret', 'wrong', false],
    [['primary', 'fallback'], 'primary', true],
    [['primary', 'fallback'], 'fallback', true],
    [['primary', 'fallback'], 'wrong', false],
    [['', 'fallback'], 'fallback', true],
    [['primary', ''], 'primary', true],
    [['', ''], '', false],
    ['', '', false],
  ])(
    'preserves internal HTTP credential comparison: %j, %s',
    (expected, supplied, valid) => {
      expect(
        Authentication.checkCredentials(
          new Map([['internal', expected]]),
          'internal',
          supplied
        )
      ).toBe(valid)
    }
  )
  it('rejects unknown internal HTTP users', () => {
    expect(
      Authentication.checkCredentials(new Map(), 'unknown', 'secret')
    ).toBe(false)
  })
})
