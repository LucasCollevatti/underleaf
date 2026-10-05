import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import RetiredIdentityRouter from '../../../../app/src/Features/Underleaf/UnderleafRetiredIdentityRouter.mjs'

vi.mock('@overleaf/settings', () => ({ default: { underleaf: true } }))
vi.mock(
  '../../../../app/src/Features/UserMembership/UserMembershipMiddleware.mjs',
  () => ({ default: {} })
)
vi.mock(
  '../../../../app/src/Features/UserMembership/UserMembershipController.mjs',
  () => ({ default: {} })
)
vi.mock(
  '../../../../app/src/Features/Subscription/SubscriptionGroupController.mjs',
  () => ({ default: {} })
)
vi.mock(
  '../../../../app/src/Features/Subscription/TeamInvitesController.mjs',
  () => ({ default: {} })
)
vi.mock('../../../../app/src/infrastructure/RateLimiter.mjs', () => ({
  RateLimiter: class {},
}))
vi.mock(
  '../../../../app/src/Features/Security/RateLimiterMiddleware.mjs',
  () => ({ default: {} })
)
import MembershipRouter from '../../../../app/src/Features/UserMembership/UserMembershipRouter.mjs'

let app
beforeEach(() => {
  app = express()
  RetiredIdentityRouter.apply(app)
  // A later inherited module must not be able to restore a retired endpoint.
  app.use((req, res) => res.sendStatus(200))
})

describe('Underleaf retired email identity routes', () => {
  it.each([
    ['get', '/register'],
    ['post', '/registration/confirm-email'],
    ['get', '/launchpad'],
    ['post', '/user/password/reset'],
    ['get', '/user/password/set'],
    ['post', '/user/reconfirm'],
    ['post', '/user/emails/confirm'],
    ['post', '/user/emails/add-secondary'],
    ['get', '/user/email-preferences'],
    ['post', '/user/newsletter/subscribe'],
    ['get', '/user/subscription'],
    ['post', '/user/subscription/account/email'],
    ['put', '/subscription/invites/example'],
    ['get', '/user/bonus'],
    ['get', '/user/affiliations'],
    ['get', '/user/activate'],
    ['get', '/read-only/one-time-login'],
    ['get', '/compromised-password'],
    ['post', '/manage/groups/group-id/invites'],
    ['post', '/manage/institutions/123/managers'],
    ['post', '/manage/publishers/example/managers'],
  ])(
    'keeps %s %s unavailable even when a later router accepts it',
    async (method, path) => {
      expect((await request(app)[method](path)).status).toBe(404)
    }
  )
  it.each([
    '/login',
    '/welcome',
    '/project',
    '/admin/users',
    '/user/password/update',
  ])('preserves the local route %s', async path => {
    expect((await request(app).get(path)).status).toBe(200)
  })
  it('does not register institutional or group email membership handlers', () => {
    const router = { get: vi.fn(), post: vi.fn(), delete: vi.fn() }
    MembershipRouter.apply(router)
    for (const handler of Object.values(router))
      expect(handler).not.toHaveBeenCalled()
  })
})
