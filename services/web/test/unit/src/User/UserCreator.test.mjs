import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  existing: null,
  hash: vi.fn(),
  save: vi.fn(),
}))
vi.mock(
  '../../../../app/src/Features/Authentication/AuthenticationManager.mjs',
  () => ({
    default: {
      validatePassword: value =>
        typeof value === 'string' && value.length >= 8
          ? null
          : { info: { code: 'invalid_password' } },
      promises: { hashPassword: mocks.hash },
    },
  })
)
vi.mock('../../../../app/src/Features/User/UserDeleter.mjs', () => ({
  default: {},
}))
vi.mock('../../../../app/src/infrastructure/mongodb.mjs', () => ({ db: {} }))
vi.mock('../../../../app/src/models/User.mjs', () => ({
  User: class {
    constructor(data) {
      Object.assign(this, data)
    }
    static findOne() {
      return {
        session() {
          return this
        },
        select() {
          return this
        },
        lean: async () => mocks.existing,
      }
    }
    save(options) {
      mocks.save(this, options)
      return Promise.resolve(this)
    }
  },
}))

import UserCreator from '../../../../app/src/Features/User/UserCreator.mjs'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.existing = null
  mocks.hash.mockResolvedValue('bcrypt-hash')
})

describe('UserCreator username accounts', () => {
  it('creates a normalized account without email or duplicate password fields', async () => {
    const user = await UserCreator.promises.createNewUser({
      username: ' ALPHA ',
      displayName: ' Alpha User ',
      password: 'local-secret',
    })
    expect(user).toMatchObject({
      username: 'alpha',
      displayName: 'Alpha User',
      passwordHash: 'bcrypt-hash',
      role: 'user',
      status: 'active',
    })
    for (const field of ['email', 'emails', 'password', 'hashedPassword'])
      expect(user).not.toHaveProperty(field)
    expect(mocks.hash).toHaveBeenCalledWith('local-secret')
  })
  it('defaults the display name to username', async () => {
    const user = await UserCreator.promises.createNewUser({
      username: 'alpha',
      password: 'local-secret',
    })
    expect(user.displayName).toBe('alpha')
  })
  it('does not create an email identity even when legacy attributes are supplied', async () => {
    const user = await UserCreator.promises.createNewUser({
      username: 'alpha',
      password: 'local-secret',
      email: 'old@example.org',
      emails: [],
    })
    expect(user).not.toHaveProperty('email')
    expect(user).not.toHaveProperty('emails')
  })
  it.each(['', 'ab', 'alpha@example.org', '-alpha', 'alpha-', 'x'.repeat(33)])(
    'rejects invalid usernames: %s',
    async username => {
      await expect(
        UserCreator.promises.createNewUser({
          username,
          password: 'local-secret',
        })
      ).rejects.toMatchObject({ code: 'invalid_username' })
      expect(mocks.save).not.toHaveBeenCalled()
    }
  )
  it('rejects duplicate usernames before saving', async () => {
    mocks.existing = { _id: 'existing-id' }
    await expect(
      UserCreator.promises.createNewUser({
        username: 'alpha',
        password: 'local-secret',
      })
    ).rejects.toMatchObject({ code: 'username_taken' })
    expect(mocks.save).not.toHaveBeenCalled()
  })
  it('rejects missing local passwords', async () => {
    await expect(
      UserCreator.promises.createNewUser({ username: 'alpha' })
    ).rejects.toMatchObject({ code: 'invalid_password' })
  })
  it('creates administrator accounts with coherent role fields', async () => {
    const user = await UserCreator.promises.createNewUser({
      username: 'alpha',
      password: 'local-secret',
      role: 'admin',
    })
    expect(user).toMatchObject({ role: 'admin', isAdmin: true })
  })
  it('passes an installation transaction through to persistence', async () => {
    const session = { transaction: true }
    await UserCreator.promises.createNewUser(
      { username: 'alpha', password: 'local-secret' },
      { session }
    )
    expect(mocks.save).toHaveBeenCalledWith(expect.anything(), { session })
  })
})
