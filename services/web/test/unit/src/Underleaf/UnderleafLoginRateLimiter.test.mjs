import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { z } from '../../../../app/src/infrastructure/Validation.mjs'

const modulePath = '../../../../app/src/Features/Security/LoginRateLimiter.mjs'
const settingsPath = '@overleaf/settings'
const rateLimiterPath = '../../../../app/src/infrastructure/RateLimiter.mjs'
const emailHelperPath = '../../../../app/src/Features/Helpers/EmailHelper.mjs'

describe('Underleaf username login rate limiting', function () {
  let settings, consume, remove, limiter

  beforeEach(async function () {
    settings = { underleaf: true }
    consume = vi.fn().mockResolvedValue(undefined)
    remove = vi.fn().mockResolvedValue(undefined)
    vi.doMock(settingsPath, () => ({ default: settings }))
    vi.doMock(rateLimiterPath, () => ({
      RateLimiter: class {
        consume(...args) {
          return consume(...args)
        }
        delete(...args) {
          return remove(...args)
        }
      },
    }))
    vi.doMock(emailHelperPath, () => ({
      default: { emailSchema: z.string().email() },
    }))
    vi.resetModules()
    limiter = (await import(modulePath)).default.promises
  })

  afterEach(function () {
    vi.doUnmock(settingsPath)
    vi.doUnmock(rateLimiterPath)
    vi.doUnmock(emailHelperPath)
    vi.resetModules()
  })

  it('counts differently cased usernames against the same account', async function () {
    expect(await limiter.processLoginRequest(' First-Admin ')).toBe(true)
    expect(consume).toHaveBeenCalledWith('first-admin', 1, {
      method: 'username',
    })
    await limiter.processLoginRequest('first-admin')
    expect(consume).toHaveBeenLastCalledWith('first-admin', 1, {
      method: 'username',
    })
  })

  it('rejects malformed or unbounded identifiers before using Redis', async function () {
    for (const value of [{ username: 'admin' }, '', 'x'.repeat(33)]) {
      await expect(limiter.processLoginRequest(value)).rejects.toThrow(
        'Invalid request'
      )
    }
    expect(consume).not.toHaveBeenCalled()
  })

  it('rejects exhausted quotas', async function () {
    consume.mockRejectedValue({ consumedPoints: 11 })
    expect(await limiter.processLoginRequest('first-admin')).toBe(false)
  })

  it('propagates Redis failures instead of bypassing the limit', async function () {
    const error = new Error('Redis unavailable')
    consume.mockRejectedValue(error)
    await expect(limiter.processLoginRequest('first-admin')).rejects.toBe(error)
  })

  it('clears the username quota after a successful login', async function () {
    await limiter.recordSuccessfulLogin('first-admin')
    expect(remove).toHaveBeenCalledWith('first-admin')
  })

  it('never treats email as an account identifier', async function () {
    await expect(
      limiter.processLoginRequest('user@example.com')
    ).rejects.toThrow('Invalid request')
    expect(consume).not.toHaveBeenCalled()
  })
})
