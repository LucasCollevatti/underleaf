import { RateLimiter } from '../../infrastructure/RateLimiter.mjs'
import { callbackify } from '@overleaf/promise-utils'
import Settings from '@overleaf/settings'
import { InvalidRequestError } from '@overleaf/validation-tools'
import { z } from '../../infrastructure/Validation.mjs'

const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9][a-z0-9._-]{1,30}[a-z0-9]$/)

const rateLimiterLoginUsername = new RateLimiter(
  'login',
  Settings.rateLimit?.login?.username || {
    points: 10,
    duration: 120,
  }
)

async function processLoginRequest(username) {
  try {
    username = usernameSchema.parse(username)
  } catch (err) {
    throw new InvalidRequestError(err)
  }
  try {
    await rateLimiterLoginUsername.consume(username, 1, {
      method: 'username',
    })
    return true
  } catch (err) {
    if (err instanceof Error) {
      throw err
    } else {
      return false
    }
  }
}

async function recordSuccessfulLogin(username) {
  await rateLimiterLoginUsername.delete(username)
}

const LoginRateLimiter = {
  processLoginRequest: callbackify(processLoginRequest),
  recordSuccessfulLogin: callbackify(recordSuccessfulLogin),
}
LoginRateLimiter.promises = {
  processLoginRequest,
  recordSuccessfulLogin,
}

export default LoginRateLimiter
