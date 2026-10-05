import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  update: vi.fn(),
  audit: vi.fn(),
  sessions: vi.fn(),
  hooks: vi.fn(),
  normalize: vi.fn(query =>
    typeof query === 'string' ? { _id: query } : query
  ),
}))
vi.mock('../../../../app/src/infrastructure/mongodb.mjs', () => ({
  db: { users: { updateOne: mocks.update } },
}))
vi.mock('../../../../app/src/Features/Helpers/Mongo.mjs', () => ({
  default: { normalizeQuery: mocks.normalize },
}))
vi.mock('@overleaf/logger', () => ({ default: {} }))
vi.mock('../../../../app/src/Features/Errors/Errors.js', () => ({
  default: { NotFoundError: class extends Error {} },
}))
vi.mock('../../../../app/src/Features/User/UserAuditLogHandler.mjs', () => ({
  default: { promises: { addEntry: mocks.audit } },
}))
vi.mock('../../../../app/src/Features/User/UserSessionsManager.mjs', () => ({
  default: { promises: { removeSessionsFromRedis: mocks.sessions } },
}))
vi.mock('../../../../app/src/infrastructure/Modules.mjs', () => ({
  default: { promises: { hooks: { fire: mocks.hooks } } },
}))

import UserUpdater from '../../../../app/src/Features/User/UserUpdater.mjs'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.update.mockResolvedValue({ matchedCount: 1, modifiedCount: 1 })
  mocks.audit.mockResolvedValue(undefined)
  mocks.sessions.mockResolvedValue(undefined)
  mocks.hooks.mockResolvedValue([])
})

describe('UserUpdater username identity', () => {
  it('updates account metadata by ID without adding email identity', async () => {
    const update = { $set: { betaProgram: true } }
    await UserUpdater.promises.updateUser('account-id', update)
    expect(mocks.update).toHaveBeenCalledWith({ _id: 'account-id' }, update)
  })
  it('preserves callback callers for metadata updates', async () => {
    const result = await new Promise((resolve, reject) =>
      UserUpdater.updateUser(
        'account-id',
        { $set: { labsProgram: true } },
        (error, result) => (error ? reject(error) : resolve(result))
      )
    )
    expect(result.matchedCount).toBe(1)
  })
  it.each([
    'email',
    'emails',
    'emails.0.email',
    'password',
    'hashedPassword',
    'must_reconfirm',
    'samlIdentifiers',
    'thirdPartyIdentifiers',
    'enrollment.sso',
    'enrollment.sso.0',
  ])('rejects restoring %s', async field => {
    await expect(
      UserUpdater.promises.updateUser('account-id', {
        $set: { [field]: 'legacy' },
      })
    ).rejects.toThrow('Cannot restore retired')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('rejects restoring SSO through its parent object', async () => {
    await expect(
      UserUpdater.promises.updateUser('account-id', {
        $set: { enrollment: { sso: [] } },
      })
    ).rejects.toThrow('Cannot restore retired')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('rejects renaming a field into email identity', async () => {
    await expect(
      UserUpdater.promises.updateUser('account-id', {
        $rename: { institution: 'email' },
      })
    ).rejects.toThrow('Cannot restore retired')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it.each([null, [], [{ $set: { email: 'legacy' } }], { email: 'legacy' }])(
    'rejects replacement/pipeline updates: %j',
    async update => {
      await expect(
        UserUpdater.promises.updateUser('account-id', update)
      ).rejects.toThrow('field operators')
      expect(mocks.update).not.toHaveBeenCalled()
    }
  )
  it('allows removal of retired fields during cleanup', async () => {
    const update = { $unset: { email: 1, 'enrollment.sso': 1 } }
    await UserUpdater.promises.updateUser('account-id', update)
    expect(mocks.update).toHaveBeenCalledWith({ _id: 'account-id' }, update)
  })
  it('suspends the canonical account and revokes its identity and sessions', async () => {
    await UserUpdater.promises.suspendUser('account-id', {
      initiatorId: 'admin-id',
      ip: '127.0.0.1',
    })
    expect(mocks.update).toHaveBeenCalledWith(
      { _id: 'account-id', status: { $ne: 'disabled' } },
      expect.objectContaining({
        $set: expect.objectContaining({ status: 'disabled', suspended: true }),
        $inc: { identityVersion: 1 },
      })
    )
    expect(mocks.audit).toHaveBeenCalledWith(
      'account-id',
      'account-suspension',
      'admin-id',
      '127.0.0.1',
      {}
    )
    expect(mocks.sessions).toHaveBeenCalledWith({ _id: 'account-id' })
    expect(mocks.hooks).toHaveBeenCalledWith(
      'removeDropbox',
      'account-id',
      'account-suspension'
    )
  })
  it('does not audit or remove sessions if the account is absent/already disabled', async () => {
    mocks.update.mockResolvedValue({ matchedCount: 0 })
    await expect(
      UserUpdater.promises.suspendUser('account-id')
    ).rejects.toThrow('not found or already suspended')
    expect(mocks.audit).not.toHaveBeenCalled()
    expect(mocks.sessions).not.toHaveBeenCalled()
  })
  it('propagates persistence failures', async () => {
    const failure = new Error('Mongo unavailable')
    mocks.update.mockRejectedValue(failure)
    await expect(
      UserUpdater.promises.updateUser('account-id', {
        $set: { labsProgram: true },
      })
    ).rejects.toBe(failure)
  })
  it('has no email or SSO identity mutation API', () => {
    for (const name of [
      'addEmailAddress',
      'changeEmailAddress',
      'confirmEmail',
      'removeEmailAddress',
      'setDefaultEmailAddress',
      'migrateDefaultEmailAddress',
      'removeReconfirmFlag',
      'clearSAMLData',
      'clearThirdPartyIdentifiers',
    ]) {
      expect(UserUpdater).not.toHaveProperty(name)
      expect(UserUpdater.promises).not.toHaveProperty(name)
    }
  })
})
