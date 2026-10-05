import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getUser: vi.fn(),
  sessions: vi.fn(),
  removeSessions: vi.fn(),
  hooks: vi.fn(),
  redirect: vi.fn(),
  getRedirect: vi.fn(),
}))
vi.mock('@overleaf/settings', () => ({
  default: { underleaf: true, nav: {}, enableGitBridge: true },
}))
vi.mock('@overleaf/logger', () => ({
  default: { debug: vi.fn(), error: vi.fn() },
}))
vi.mock('@overleaf/o-error', () => ({
  default: class extends Error {
    static tag(error) {
      return error
    }
  },
}))
vi.mock('../../../../app/src/Features/User/UserGetter.mjs', () => ({
  default: { promises: { getUser: mocks.getUser } },
}))
vi.mock('../../../../app/src/Features/User/UserSessionsManager.mjs', () => ({
  default: {
    getAllUserSessions: mocks.sessions,
    removeSessionsFromRedis: mocks.removeSessions,
  },
}))
vi.mock('../../../../app/src/infrastructure/Modules.mjs', () => ({
  default: { promises: { hooks: { fire: mocks.hooks } } },
}))
vi.mock(
  '../../../../app/src/Features/Authentication/AuthenticationController.mjs',
  () => ({
    default: {
      setRedirectInSession: mocks.redirect,
      getRedirectFromSession: mocks.getRedirect,
    },
  })
)

import UserPagesController from '../../../../app/src/Features/User/UserPagesController.mjs'

let req, user
beforeEach(() => {
  vi.clearAllMocks()
  user = {
    _id: 'account-id',
    username: 'alpha',
    displayName: 'Alpha',
    role: 'user',
    status: 'active',
    identityVersion: 1,
    passwordHash: 'private-hash',
    features: {},
    refProviders: { zotero: { encrypted: 'private-token' } },
    ip_address: '127.0.0.1',
    session_created: 'created',
  }
  req = {
    query: {},
    session: { passport: { user } },
    capabilitySet: new Set(['change-password']),
  }
  mocks.getUser.mockResolvedValue(user)
  mocks.hooks.mockResolvedValue([[]])
  mocks.getRedirect.mockReturnValue(undefined)
  mocks.sessions.mockImplementation((user, excluded, callback) =>
    callback(null, [])
  )
  mocks.removeSessions.mockImplementation((user, retained, callback) =>
    callback()
  )
})
function invoke(handler) {
  return new Promise((resolve, reject) => {
    const headers = {}
    const res = {
      set: (key, value) => {
        headers[key] = value
        return res
      },
      render: (view, data) => resolve({ view, data, headers }),
      redirect: url => resolve({ redirect: url }),
    }
    handler(req, res, reject)
  })
}

describe('UserPagesController local username accounts', () => {
  it('renders login in the shared authentication shell without registration data', async () => {
    const result = await invoke(UserPagesController.loginPage)
    expect(result.view).toBe('underleaf/auth')
    expect(result.data.authPage).toBe('login')
    expect(result.headers['Cache-Control']).toBe('no-store')
  })
  it('preserves an explicit project redirect', async () => {
    req.query.redir = '/project/project-id'
    await invoke(UserPagesController.loginPage)
    expect(mocks.redirect).toHaveBeenCalledWith(req, '/project/project-id')
  })
  it('does not overwrite an existing login redirect', async () => {
    req.query.redir = '/project/new'
    mocks.getRedirect.mockReturnValue('/project/existing')
    await invoke(UserPagesController.loginPage)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
  it('marks parameterized login pages as noindex', async () => {
    req.query.redir = '/project/project-id'
    const result = await invoke(UserPagesController.loginPage)
    expect(result.data.metadata.robotsNoindexNofollow).toBe(true)
  })
  it('renders canonical settings without email, SSO or credentials', async () => {
    const result = await invoke(UserPagesController.settingsPage)
    expect(result.view).toBe('user/settings')
    expect(result.data.user).toMatchObject({
      id: 'account-id',
      username: 'alpha',
      displayName: 'Alpha',
      role: 'user',
      status: 'active',
    })
    for (const field of [
      'email',
      'emails',
      'password',
      'passwordHash',
      'samlIdentifiers',
      'thirdPartyIdentifiers',
    ])
      expect(result.data.user).not.toHaveProperty(field)
    for (const field of [
      'oauthProviders',
      'ssoErrorMessage',
      'memberOfSSOEnabledGroups',
      'reconfirmationRemoveEmail',
      'currentManagedUserAdminEmail',
      'emailAddressLimit',
    ])
      expect(result.data).not.toHaveProperty(field)
    expect(result.data.hasPassword).toBe(true)
    expect(result.data.user.refProviders).toEqual({
      zotero: true,
      mendeley: false,
      papers: false,
    })
  })
  it('keeps sync notifications and consumes them from the session', async () => {
    req.session.projectSyncSuccessMessage = 'Synced'
    req.session.referenceLinkingErrorMessage = 'Cannot link'
    const result = await invoke(UserPagesController.settingsPage)
    expect(result.data.projectSyncSuccessMessage).toBe('Synced')
    expect(result.data.referenceLinkingErrorMessage).toBe('Cannot link')
    expect(req.session).not.toHaveProperty('projectSyncSuccessMessage')
    expect(req.session).not.toHaveProperty('referenceLinkingErrorMessage')
  })
  it('preserves personal access token integrations independently of login identity', async () => {
    mocks.hooks.mockResolvedValue([[{ name: 'automation', id: 'token-id' }]])
    const result = await invoke(UserPagesController.settingsPage)
    expect(result.data.personalAccessTokens).toEqual([
      { name: 'automation', id: 'token-id' },
    ])
    expect(mocks.hooks).toHaveBeenCalledWith(
      'listPersonalAccessTokens',
      'account-id'
    )
  })
  it('still renders settings if an optional integration fails', async () => {
    mocks.hooks.mockRejectedValue(new Error('Optional integration unavailable'))
    expect((await invoke(UserPagesController.settingsPage)).view).toBe(
      'user/settings'
    )
  })
  it('expires sessions for a deleted account before redirecting', async () => {
    mocks.getUser.mockResolvedValue(null)
    expect((await invoke(UserPagesController.settingsPage)).redirect).toBe('/')
    expect(mocks.removeSessions).toHaveBeenCalledWith(
      { _id: 'account-id' },
      null,
      expect.any(Function)
    )
  })
  it('lists other sessions without querying identity by email', async () => {
    req.sessionID = 'current-session'
    mocks.sessions.mockImplementation((user, excluded, callback) =>
      callback(null, [{ ip_address: 'other-device' }])
    )
    const result = await invoke(UserPagesController.sessionsPage)
    expect(result.view).toBe('user/sessions')
    expect(result.data.sessions).toEqual([{ ip_address: 'other-device' }])
    expect(mocks.sessions).toHaveBeenCalledWith(
      user,
      ['current-session'],
      expect.any(Function)
    )
  })
  it('propagates session retrieval errors', async () => {
    const failure = new Error('Session store unavailable')
    mocks.sessions.mockImplementation((user, excluded, callback) =>
      callback(failure)
    )
    await expect(invoke(UserPagesController.sessionsPage)).rejects.toBe(failure)
  })
  it('does not expose registration, recovery or email settings pages', () => {
    for (const name of [
      'registerPage',
      'reconfirmPage',
      'emailPreferencesPage',
      'oneTimeLoginPage',
      'compromisedPasswordPage',
    ])
      expect(UserPagesController).not.toHaveProperty(name)
  })
})
