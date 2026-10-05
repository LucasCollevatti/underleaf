import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findById: vi.fn(),
  getUser: vi.fn(),
  authenticate: vi.fn(),
  setPassword: vi.fn(),
  audit: vi.fn(),
  removeSessions: vi.fn(),
  getSessions: vi.fn(),
  untrack: vi.fn(),
  expireTokens: vi.fn(),
  deleteUser: vi.fn(),
  expireDeleted: vi.fn(),
  expireAllDeleted: vi.fn(),
  hooks: vi.fn(),
  badRequest: vi.fn(),
}))
vi.mock('@overleaf/settings', () => ({
  default: { underleaf: true, siteUrl: 'http://underleaf.test' },
}))
vi.mock('@overleaf/logger', () => ({
  default: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    err: vi.fn(),
    error: vi.fn(),
  },
}))
vi.mock('@overleaf/metrics', () => ({ default: { inc: vi.fn() } }))
vi.mock('../../../../app/src/models/User.mjs', () => ({
  User: { findById: mocks.findById },
}))
vi.mock('../../../../app/src/Features/User/UserGetter.mjs', () => ({
  default: { promises: { getUser: mocks.getUser } },
}))
vi.mock('../../../../app/src/Features/User/UserDeleter.mjs', () => ({
  default: {
    promises: {
      deleteUser: mocks.deleteUser,
      expireDeletedUser: mocks.expireDeleted,
      expireDeletedUsersAfterDuration: mocks.expireAllDeleted,
    },
  },
}))
vi.mock('../../../../app/src/Features/User/UserAuditLogHandler.mjs', () => ({
  default: {
    addEntryInBackground: vi.fn(),
    promises: { addEntry: mocks.audit },
  },
}))
vi.mock(
  '../../../../app/src/Features/Authentication/AuthenticationManager.mjs',
  () => ({
    default: {
      promises: {
        authenticate: mocks.authenticate,
        setUserPassword: mocks.setPassword,
      },
      getMessageForInvalidPasswordError: () => ({ key: 'password-too-short' }),
    },
  })
)
vi.mock('../../../../app/src/Features/User/UserSessionsManager.mjs', () => ({
  default: {
    promises: {
      removeSessionsFromRedis: mocks.removeSessions,
      getAllUserSessions: mocks.getSessions,
      untrackSession: mocks.untrack,
    },
  },
}))
vi.mock(
  '../../../../app/src/Features/Security/OneTimeTokenHandler.mjs',
  () => ({
    default: { promises: { expireAllTokensForUser: mocks.expireTokens } },
  })
)
vi.mock('../../../../app/src/Features/Errors/Errors.js', () => ({
  default: { SubscriptionAdminDeletionError: class extends Error {} },
}))
vi.mock('../../../../app/src/Features/Errors/HttpErrorHandler.mjs', () => ({
  default: { badRequest: mocks.badRequest },
}))
vi.mock('../../../../app/src/infrastructure/Modules.mjs', () => ({
  default: { promises: { hooks: { fire: mocks.hooks } } },
}))

import UserController from '../../../../app/src/Features/User/UserController.mjs'

let user, req, res
function call(handler) {
  return new Promise((resolve, reject) => {
    const next = error => (error ? reject(error) : resolve())
    for (const method of ['sendStatus', 'json', 'redirect'])
      res[method].mockImplementation(value => {
        resolve(value)
        return res
      })
    mocks.badRequest.mockImplementation((req, res, message) => {
      resolve(message)
    })
    handler(req, res, next)
  })
}
beforeEach(() => {
  vi.clearAllMocks()
  user = {
    _id: '000000000000000000000001',
    username: 'alpha',
    displayName: 'Alpha',
    status: 'active',
    identityVersion: 1,
    ace: {},
    save: vi.fn().mockResolvedValue(undefined),
  }
  req = {
    body: {},
    params: {},
    query: {},
    headers: {},
    ip: '127.0.0.1',
    sessionID: 'retained-session',
    session: {
      passport: { user: { ...user } },
      destroy: vi.fn(callback => callback()),
    },
    logout: vi.fn(callback => callback()),
    logger: { addFields: vi.fn() },
    i18n: { translate: key => key },
    accepts: () => 'json',
  }
  res = {
    sendStatus: vi.fn(),
    json: vi.fn(),
    redirect: vi.fn(),
    status: vi.fn(),
    set: vi.fn(),
  }
  res.status.mockReturnValue(res)
  mocks.findById.mockReturnValue({ exec: async () => user })
  mocks.getUser.mockResolvedValue(user)
  mocks.authenticate.mockResolvedValue({ user })
  for (const mock of [
    mocks.setPassword,
    mocks.audit,
    mocks.removeSessions,
    mocks.untrack,
    mocks.expireTokens,
    mocks.deleteUser,
    mocks.expireDeleted,
    mocks.expireAllDeleted,
  ])
    mock.mockResolvedValue(undefined)
  mocks.getSessions.mockResolvedValue([])
  mocks.hooks.mockResolvedValue([])
})

describe('UserController local profile and password', () => {
  it('updates display name, legacy presentation names and the current session', async () => {
    req.body = { displayName: ' New name ' }
    expect(await call(UserController.updateUserSettings)).toBe(200)
    expect(user).toMatchObject({
      displayName: 'New name',
      first_name: 'New name',
      last_name: '',
    })
    expect(req.session.passport.user.displayName).toBe('New name')
    expect(user.save).toHaveBeenCalledOnce()
  })
  it.each(['email', 'emails', 'username', 'role', 'status', 'passwordHash'])(
    'rejects profile changes to %s',
    async field => {
      req.body = { [field]: field === 'emails' ? [] : 'tampered' }
      await expect(call(UserController.updateUserSettings)).rejects.toThrow(
        'Invalid request'
      )
      expect(user.save).not.toHaveBeenCalled()
    }
  )
  it.each(['', ' ', 'x'.repeat(256)])(
    'rejects invalid display names: %s',
    async displayName => {
      req.body = { displayName }
      await expect(call(UserController.updateUserSettings)).rejects.toThrow(
        'Invalid request'
      )
    }
  )
  it.each([
    ['mode', 'vim', 'mode'],
    ['editorTheme', 'textmate', 'theme'],
    ['editorDarkTheme', 'dark', 'darkTheme'],
    ['mathPreview', false, 'mathPreview'],
    ['editorTabs', false, 'editorTabs'],
    ['fontSize', 16, 'fontSize'],
  ])(
    'preserves the editor preference %s',
    async (field, value, storedField) => {
      req.body = { [field]: value }
      expect(await call(UserController.updateUserSettings)).toBe(200)
      expect(user.ace[storedField]).toBe(value)
    }
  )
  it('keeps the active session after password change and revokes the others', async () => {
    req.body = {
      currentPassword: 'old-secret',
      newPassword1: 'new-secret',
      newPassword2: 'new-secret',
    }
    const result = await call(UserController.changePassword)
    expect(result.message).toMatchObject({ type: 'success', username: 'alpha' })
    expect(result.message).not.toHaveProperty('email')
    expect(mocks.setPassword).toHaveBeenCalledWith(user, 'new-secret')
    expect(req.session.passport.user.identityVersion).toBe(2)
    expect(mocks.removeSessions).toHaveBeenCalledWith(user, 'retained-session')
    expect(mocks.expireTokens).toHaveBeenCalledWith(user._id, 'password')
  })
  it('rejects an incorrect current password without changing anything', async () => {
    req.body = {
      currentPassword: 'wrong',
      newPassword1: 'new-secret',
      newPassword2: 'new-secret',
    }
    mocks.authenticate.mockResolvedValue({ user: null })
    expect(await call(UserController.changePassword)).toBe(
      'password_change_old_password_wrong'
    )
    expect(mocks.setPassword).not.toHaveBeenCalled()
  })
  it('rejects password confirmation mismatch', async () => {
    req.body = {
      currentPassword: 'old-secret',
      newPassword1: 'new-secret',
      newPassword2: 'different',
    }
    expect(await call(UserController.changePassword)).toBe(
      'password_change_passwords_do_not_match'
    )
    expect(mocks.setPassword).not.toHaveBeenCalled()
  })
  it('returns the local password policy error without revoking sessions', async () => {
    req.body = {
      currentPassword: 'old-secret',
      newPassword1: 'tiny',
      newPassword2: 'tiny',
    }
    mocks.setPassword.mockRejectedValue(
      Object.assign(new Error('Invalid password'), {
        name: 'InvalidPasswordError',
      })
    )
    expect(await call(UserController.changePassword)).toEqual({
      message: { key: 'password-too-short' },
    })
    expect(res.status).toHaveBeenCalledWith(400)
    expect(mocks.removeSessions).not.toHaveBeenCalled()
  })
  it('clears other sessions using account IDs and records the operation', async () => {
    expect(await call(UserController.clearSessions)).toBe(201)
    expect(mocks.getUser).toHaveBeenCalledWith(user._id, { username: 1 })
    expect(mocks.removeSessions).toHaveBeenCalledWith(user, 'retained-session')
    expect(mocks.audit).toHaveBeenCalledWith(
      user._id,
      'clear-sessions',
      user._id,
      req.ip,
      { sessions: [] }
    )
  })
  it('logs out and destroys the session', async () => {
    expect(await call(UserController.logout)).toEqual({ redir: '/login' })
    expect(req.logout).toHaveBeenCalledOnce()
    expect(req.session.destroy).toHaveBeenCalledOnce()
    expect(mocks.untrack).toHaveBeenCalledWith(
      expect.objectContaining({ username: 'alpha' }),
      'retained-session'
    )
  })
  it('rejects deletion without a password', async () => {
    expect(await call(UserController.tryDeleteUser)).toBe(403)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it('rejects deletion when password verification fails', async () => {
    req.body = { password: 'wrong' }
    mocks.authenticate.mockResolvedValue({ user: null })
    expect(await call(UserController.tryDeleteUser)).toBe(403)
    expect(mocks.deleteUser).not.toHaveBeenCalled()
  })
  it('preserves authenticated deletion and session cleanup', async () => {
    req.body = { password: 'local-secret' }
    expect(await call(UserController.tryDeleteUser)).toBe(200)
    expect(mocks.deleteUser).toHaveBeenCalledWith(user._id, {
      deleterUser: user,
      ipAddress: req.ip,
    })
    expect(req.session.destroy).toHaveBeenCalledOnce()
  })
  it('expires a deleted account by ID', async () => {
    req.params = { userId: user._id }
    expect(await call(UserController.expireDeletedUser)).toBe(204)
    expect(mocks.expireDeleted).toHaveBeenCalledOnce()
  })
})
