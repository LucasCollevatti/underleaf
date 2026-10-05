import { describe, expect, it, vi } from 'vitest'
import Controller from '../../../../app/src/Features/User/UserInfoController.mjs'

vi.mock('../../../../app/src/Features/User/UserGetter.mjs', () => ({
  default: { promises: {} },
}))
vi.mock('mongodb-legacy', () => ({ default: { ObjectId: class {} } }))

describe('Underleaf user API identity', function () {
  it('returns username and displayName without exposing email or credentials', function () {
    const info = Controller.formatPersonalInfo({
      _id: 'user-id',
      username: 'alice',
      displayName: 'Alice',
      role: 'user',
      status: 'active',
      email: 'old@example.org',
      emails: [{ email: 'old@example.org' }],
      passwordHash: 'secret',
      hashedPassword: 'old-secret',
    })
    expect(info).toEqual({
      id: 'user-id',
      username: 'alice',
      displayName: 'Alice',
      role: 'user',
      status: 'active',
    })
  })

  it('represents a deleted user without fabricating an email identity', function () {
    expect(Controller.formatPersonalInfo(null)).toEqual({})
  })
})
