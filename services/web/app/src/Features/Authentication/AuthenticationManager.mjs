import Settings from '@overleaf/settings'
import { User } from '../../models/User.mjs'
import { db, ObjectId } from '../../infrastructure/mongodb.mjs'
import bcrypt from 'bcrypt'
import { sanitizeControlCharacters } from '../../infrastructure/Sanitize.mjs'

import {
  InvalidPasswordError,
  ParallelLoginError,
  PasswordMustBeDifferentError,
} from './AuthenticationErrors.mjs'

import { callbackify, callbackifyMultiResult } from '@overleaf/promise-utils'
import UserAuditLogHandler from '../User/UserAuditLogHandler.mjs'
import logger from '@overleaf/logger'
import Metrics from '@overleaf/metrics'

const BCRYPT_ROUNDS = Settings.security.bcryptRounds || 12
const BCRYPT_MINOR_VERSION = Settings.security.bcryptMinorVersion || 'a'

const _checkWriteResult = function (result) {
  // for MongoDB
  return !!(result && result.modifiedCount === 1)
}

function _validatePasswordNotTooLong(password) {
  // bcrypt has a hard limit of 72 bytes.
  if (Buffer.byteLength(password, 'utf8') > 72) {
    return new InvalidPasswordError({
      message: 'password is too long',
      info: { code: 'too_long' },
    })
  }
  return null
}

function _metricsForSuccessfulPasswordMatch(password) {
  const validationResult = AuthenticationManager.validatePassword(password)
  const status =
    validationResult === null ? 'success' : validationResult?.info?.code
  Metrics.inc('check-password', { status })
  return null
}

const AuthenticationManager = {
  async _checkUserPassword(query, password) {
    // Using Mongoose for legacy reasons here. The returned User instance
    // gets serialized into the session and there may be subtle differences
    // between the user returned by Mongoose vs mongodb (such as default values)
    if (
      typeof password !== 'string' ||
      !password ||
      Buffer.byteLength(password, 'utf8') > 72
    ) {
      return { user: null, match: null }
    }
    if (!query?._id && typeof query?.username !== 'string') {
      return { user: null, match: null }
    }
    const user = await User.findOne(query).exec()

    if (!user || !user.passwordHash || user.status !== 'active') {
      return { user: null, match: null }
    }

    let rounds = 0
    try {
      rounds = bcrypt.getRounds(user.passwordHash)
    } catch (err) {
      let prefix, suffix, length
      if (typeof user.passwordHash === 'string') {
        length = user.passwordHash.length
        if (user.passwordHash.length > 50) {
          // A full bcrypt hash is 60 characters long.
          prefix = user.passwordHash.slice(0, '$2a$12$x'.length)
          suffix = user.passwordHash.slice(-4)
        } else if (user.passwordHash.length > 20) {
          prefix = user.passwordHash.slice(0, 4)
          suffix = user.passwordHash.slice(-4)
        } else {
          prefix = user.passwordHash.slice(0, 4)
        }
      }
      logger.warn(
        {
          err,
          userId: user._id,
          passwordHash: {
            type: typeof user.passwordHash,
            length,
            prefix,
            suffix,
          },
        },
        'unexpected user.passwordHash value'
      )
    }
    Metrics.inc('bcrypt', 1, {
      method: 'compare',
      path: rounds,
    })

    const match = await bcrypt.compare(password, user.passwordHash)

    if (match) {
      _metricsForSuccessfulPasswordMatch(password)
    }

    return { user, match }
  },

  async authenticate(query, password, auditLog) {
    if (typeof password === 'string') {
      password = sanitizeControlCharacters(password)
    }
    const { user, match } = await AuthenticationManager._checkUserPassword(
      query,
      password
    )

    if (!user) {
      return { user: null }
    }

    const update = { $inc: { loginEpoch: 1 } }
    if (!match) {
      update.$set = { lastFailedLogin: new Date() }
    }

    const result = await User.updateOne(
      { _id: user._id, loginEpoch: user.loginEpoch },
      update,
      {}
    ).exec()

    if (result.modifiedCount !== 1) {
      throw new ParallelLoginError()
    }

    if (!match) {
      if (!auditLog) {
        return { user: null }
      } else {
        try {
          await UserAuditLogHandler.promises.addEntry(
            user._id,
            'failed-password-match',
            user._id,
            auditLog.ipAddress,
            auditLog.info
          )
        } catch (err) {
          logger.error(
            { userId: user._id, err, info: auditLog.info },
            'Error while adding AuditLog entry for failed-password-match'
          )
        }
        return { user: null }
      }
    }
    await AuthenticationManager.checkRounds(user, user.passwordHash, password)

    return { user, isPasswordReused: false }
  },

  // validates a password based on a similar set of rules previously used by `passfield.js` on the frontend
  // note that `passfield.js` enforced more rules than this, but these are the most commonly set.
  // returns null on success, or an error object.
  validatePassword(password) {
    if (password == null) {
      return new InvalidPasswordError({
        message: 'password not set',
        info: { code: 'not_set' },
      })
    }

    Metrics.inc('try-validate-password')

    let allowAnyChars, min, max
    if (Settings.passwordStrengthOptions) {
      allowAnyChars = Settings.passwordStrengthOptions.allowAnyChars === true
      if (Settings.passwordStrengthOptions.length) {
        min = Settings.passwordStrengthOptions.length.min
        max = Settings.passwordStrengthOptions.length.max
      }
    }
    allowAnyChars = !!allowAnyChars
    min = min || 8
    max = max || 72

    // we don't support passwords > 72 characters in length, because bcrypt truncates them
    if (max > 72) {
      max = 72
    }

    if (password.length < min) {
      return new InvalidPasswordError({
        message: 'password is too short',
        info: { code: 'too_short' },
      })
    }
    if (password.length > max) {
      return new InvalidPasswordError({
        message: 'password is too long',
        info: { code: 'too_long' },
      })
    }
    const passwordLengthError = _validatePasswordNotTooLong(password)
    if (passwordLengthError) {
      return passwordLengthError
    }
    if (
      !allowAnyChars &&
      !AuthenticationManager._passwordCharactersAreValid(password)
    ) {
      return new InvalidPasswordError({
        message: 'password contains an invalid character',
        info: { code: 'invalid_character' },
      })
    }

    return null
  },

  async setUserPassword(user, password) {
    return await AuthenticationManager.setUserPasswordInV2(user, password)
  },

  async checkRounds(user, passwordHash, password) {
    // Temporarily disable this function, TODO: re-enable this
    if (Settings.security.disableBcryptRoundsUpgrades) {
      Metrics.inc('bcrypt_check_rounds', 1, { status: 'disabled' })
      return
    }
    // check current number of rounds and rehash if necessary
    const currentRounds = bcrypt.getRounds(passwordHash)
    if (currentRounds < BCRYPT_ROUNDS) {
      Metrics.inc('bcrypt_check_rounds', 1, { status: 'upgrade' })
      return await AuthenticationManager._setUserPasswordInMongo(
        user,
        password,
        { invalidateSessions: false }
      )
    } else {
      Metrics.inc('bcrypt_check_rounds', 1, { status: 'success' })
    }
  },

  async hashPassword(password) {
    // Double-check the size to avoid truncating in bcrypt.
    const error = _validatePasswordNotTooLong(password)
    if (error) {
      throw error
    }

    const salt = await bcrypt.genSalt(BCRYPT_ROUNDS, BCRYPT_MINOR_VERSION)

    Metrics.inc('bcrypt', 1, {
      method: 'hash',
      path: BCRYPT_ROUNDS,
    })
    return await bcrypt.hash(password, salt)
  },

  async setUserPasswordInV2(user, password) {
    if (!user || !user.username || !user._id) {
      throw new Error('invalid user object')
    }
    password = sanitizeControlCharacters(password)
    const validationError = this.validatePassword(password)
    if (validationError) {
      throw validationError
    }
    // check if we can log in with this password. In which case we should reject it,
    // because it is the same as the existing password.
    const { match } = await AuthenticationManager._checkUserPassword(
      { _id: user._id },
      password
    )

    if (match) {
      throw new PasswordMustBeDifferentError()
    }

    return await this._setUserPasswordInMongo(user, password)
  },

  async _setUserPasswordInMongo(
    user,
    password,
    { invalidateSessions = true } = {}
  ) {
    const hash = await this.hashPassword(password)
    const result = await db.users.updateOne(
      { _id: new ObjectId(user._id.toString()) },
      {
        $set: {
          passwordHash: hash,
          updatedAt: new Date(),
        },
        ...(invalidateSessions ? { $inc: { identityVersion: 1 } } : {}),
        $unset: {
          password: true,
        },
      }
    )

    return _checkWriteResult(result)
  },

  _passwordCharactersAreValid(password) {
    let digits, letters, lettersUp, symbols
    if (
      Settings.passwordStrengthOptions &&
      Settings.passwordStrengthOptions.chars
    ) {
      digits = Settings.passwordStrengthOptions.chars.digits
      letters = Settings.passwordStrengthOptions.chars.letters
      lettersUp = Settings.passwordStrengthOptions.chars.letters_up
      symbols = Settings.passwordStrengthOptions.chars.symbols
    }
    digits = digits || '1234567890'
    letters = letters || 'abcdefghijklmnopqrstuvwxyz'
    lettersUp = lettersUp || 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    symbols = symbols || '@#$%^&*()-_=+[]{};:<>/?!£€.,'

    for (let charIndex = 0; charIndex <= password.length - 1; charIndex++) {
      if (
        digits.indexOf(password[charIndex]) === -1 &&
        letters.indexOf(password[charIndex]) === -1 &&
        lettersUp.indexOf(password[charIndex]) === -1 &&
        symbols.indexOf(password[charIndex]) === -1
      ) {
        return false
      }
    }
    return true
  },

  getMessageForInvalidPasswordError(error, req) {
    const errorCode = error?.info?.code
    const message = {
      type: 'error',
    }
    switch (errorCode) {
      case 'not_set':
        message.key = 'password-not-set'
        message.text = req.i18n.translate('invalid_password_not_set')
        break
      case 'invalid_character':
        message.key = 'password-invalid-character'
        message.text = req.i18n.translate('invalid_password_invalid_character')
        break
      case 'too_short':
        message.key = 'password-too-short'
        message.text = req.i18n.translate('invalid_password_too_short', {
          minLength: Settings.passwordStrengthOptions?.length?.min || 8,
        })
        break
      case 'too_long':
        message.key = 'password-too-long'
        message.text = req.i18n.translate('invalid_password_too_long', {
          maxLength: Settings.passwordStrengthOptions?.length?.max || 72,
        })
        break
      default:
        logger.error({ err: error }, 'Unknown password validation error code')
        message.text = req.i18n.translate('invalid_password')
        break
    }
    return message
  },
}

export default {
  validatePassword: AuthenticationManager.validatePassword,
  getMessageForInvalidPasswordError:
    AuthenticationManager.getMessageForInvalidPasswordError,
  authenticate: callbackifyMultiResult(AuthenticationManager.authenticate, [
    'user',
    'isPasswordReused',
  ]),
  setUserPassword: callbackify(AuthenticationManager.setUserPassword),
  checkRounds: callbackify(AuthenticationManager.checkRounds),
  hashPassword: callbackify(AuthenticationManager.hashPassword),
  setUserPasswordInV2: callbackify(AuthenticationManager.setUserPasswordInV2),
  promises: AuthenticationManager,
}
