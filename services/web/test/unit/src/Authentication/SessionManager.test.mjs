import { describe, expect, it } from 'vitest'
import SessionManager from '../../../../app/src/Features/Authentication/SessionManager.mjs'

function account() {
  return {
    _id: 'account-id',
    username: 'alpha',
    displayName: 'Alpha',
    identityVersion: 1,
  }
}

describe('SessionManager username identity', () => {
  it.each(['user', 'passport'])('reads canonical %s sessions', kind => {
    const user = account()
    const session = kind === 'user' ? { user } : { passport: { user } }
    expect(SessionManager.getSessionUser(session)).toBe(user)
    expect(SessionManager.getLoggedInUserId(session)).toBe(user._id)
    expect(SessionManager.isUserLoggedIn(session)).toBe(true)
  })
  it.each([
    undefined,
    {},
    { passport: {} },
    { user: { _id: 'id' } },
    { user: { ...account(), username: undefined } },
    { passport: { user: { ...account(), identityVersion: undefined } } },
  ])('rejects missing or pre-migration identity: %j', session => {
    expect(SessionManager.getSessionUser(session)).toBeNull()
    expect(SessionManager.getLoggedInUserId(session)).toBeNull()
    expect(SessionManager.isUserLoggedIn(session)).toBe(false)
  })
  it('strips stale email fields before sharing session data', () => {
    const session = {
      passport: {
        user: { ...account(), email: 'old@example.org', emails: [] },
      },
    }
    expect(SessionManager.getSessionUser(session)).toEqual(account())
  })
  it('updates display name and identity version on the stored session object', () => {
    const session = { passport: { user: account() } }
    SessionManager.setInSessionUser(session, {
      displayName: 'New name',
      identityVersion: 2,
    })
    expect(session.passport.user).toMatchObject({
      displayName: 'New name',
      identityVersion: 2,
    })
  })
  it('does not recreate an unauthenticated session', () => {
    const session = {}
    SessionManager.setInSessionUser(session, { username: 'alpha' })
    expect(session).toEqual({})
  })
})
