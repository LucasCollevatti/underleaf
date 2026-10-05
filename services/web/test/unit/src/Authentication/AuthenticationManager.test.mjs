import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import bcrypt from 'bcrypt'

const modulePath =
  '../../../../app/src/Features/Authentication/AuthenticationManager.mjs'
const settings = { underleaf: true, security: { bcryptRounds: 4 } }
const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  updateOne: vi.fn(),
  write: vi.fn(),
}))
vi.mock('@overleaf/settings', () => ({ default: settings }))
vi.mock('@overleaf/logger', () => ({
  default: { warn() {}, error() {}, err() {} },
}))
vi.mock('@overleaf/metrics', () => ({ default: { inc() {} } }))
vi.mock('../../../../app/src/models/User.mjs', () => ({
  User: { findOne: mocks.findOne, updateOne: mocks.updateOne },
}))
vi.mock('../../../../app/src/infrastructure/mongodb.mjs', () => ({
  db: { users: { updateOne: mocks.write } },
  ObjectId: class {
    constructor(value) {
      this.value = value
    }
  },
}))
vi.mock(
  '../../../../app/src/Features/Authentication/HaveIBeenPwned.mjs',
  () => ({
    default: {
      promises: {
        checkPasswordForReuse: vi.fn(() => {
          throw new Error('Underleaf must work offline')
        }),
      },
    },
  })
)
vi.mock('../../../../app/src/Features/User/UserAuditLogHandler.mjs', () => ({
  default: { promises: { addEntry: vi.fn() } },
}))

describe('AuthenticationManager username identity', function () {
  let manager
  beforeEach(async function () {
    vi.clearAllMocks()
    mocks.write.mockResolvedValue({ modifiedCount: 1 })
    mocks.updateOne.mockReturnValue({
      exec: async () => ({ modifiedCount: 1 }),
    })
    manager = (await import(modulePath)).default
  })
  afterEach(() => {
    delete settings.passwordStrengthOptions
  })

  it('never authenticates by email, even through the internal API', async function () {
    expect(
      await manager.promises._checkUserPassword(
        { email: 'admin@example.com' },
        'account-secret'
      )
    ).toEqual({ user: null, match: null })
    expect(mocks.findOne).not.toHaveBeenCalled()
  })

  it('accepts canonical passwordHash and ignores the removed hash field', async function () {
    const hash = await bcrypt.hash('account-secret', 4)
    mocks.findOne.mockReturnValue({
      exec: async () => ({
        _id: 'account-id',
        username: 'account',
        status: 'active',
        passwordHash: hash,
      }),
    })
    expect(
      (
        await manager.promises._checkUserPassword(
          { username: 'account' },
          'account-secret'
        )
      ).match
    ).toBe(true)
    mocks.findOne.mockReturnValue({
      exec: async () => ({
        _id: 'account-id',
        username: 'account',
        status: 'active',
        hashedPassword: hash,
      }),
    })
    expect(
      (
        await manager.promises._checkUserPassword(
          { username: 'account' },
          'account-secret'
        )
      ).user
    ).toBe(null)
  })

  it('rejects disabled accounts with valid passwords', async function () {
    mocks.findOne.mockReturnValue({
      exec: async () => ({
        username: 'disabled',
        status: 'disabled',
        passwordHash: await bcrypt.hash('account-secret', 4),
      }),
    })
    expect(
      (
        await manager.promises._checkUserPassword(
          { username: 'disabled' },
          'account-secret'
        )
      ).user
    ).toBe(null)
  })

  it('hashes locally and enforces the password byte limit', async function () {
    const hash = await manager.promises.hashPassword('account-secret')
    expect(await bcrypt.compare('account-secret', hash)).toBe(true)
    expect(await bcrypt.compare('wrong-secret', hash)).toBe(false)
    await expect(manager.promises.hashPassword('£'.repeat(37))).rejects.toThrow(
      'too long'
    )
  })

  it('preserves password strength policy without email dependencies', function () {
    expect(manager.validatePassword(null)?.info.code).toBe('not_set')
    expect(manager.validatePassword('short')?.info.code).toBe('too_short')
    expect(manager.validatePassword('x'.repeat(73))?.info.code).toBe('too_long')
    expect(manager.validatePassword('invalid secret')?.info.code).toBe(
      'invalid_character'
    )
    expect(manager.validatePassword('account-secret')).toBe(null)
    settings.passwordStrengthOptions = {
      allowAnyChars: true,
      length: { min: 12 },
    }
    expect(manager.validatePassword('long secret with spaces')).toBe(null)
    expect(manager.validatePassword('eight888')?.info.code).toBe('too_short')
  })

  it('changes passwords offline using the canonical field and invalidates sessions', async function () {
    const user = {
      _id: 'account-id',
      username: 'account',
      status: 'active',
      passwordHash: await bcrypt.hash('old-account-secret', 4),
      identityVersion: 1,
    }
    mocks.findOne.mockReturnValue({ exec: async () => user })
    expect(
      await manager.promises.setUserPassword(user, 'new-account-secret')
    ).toBe(true)
    const update = mocks.write.mock.calls[0][1]
    expect(update.$set.passwordHash).toBeDefined()
    expect(update.$set).not.toHaveProperty('hashedPassword')
    expect(update.$inc.identityVersion).toBe(1)
    expect(
      await bcrypt.compare('new-account-secret', update.$set.passwordHash)
    ).toBe(true)
  })

  it('rejects reusing the current password', async function () {
    const user = {
      _id: 'account-id',
      username: 'account',
      status: 'active',
      passwordHash: await bcrypt.hash('old-account-secret', 4),
    }
    mocks.findOne.mockReturnValue({ exec: async () => user })
    await expect(
      manager.promises.setUserPassword(user, 'old-account-secret')
    ).rejects.toMatchObject({ name: 'PasswordMustBeDifferentError' })
    expect(mocks.write).not.toHaveBeenCalled()
  })
})
