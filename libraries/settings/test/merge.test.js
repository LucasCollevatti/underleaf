const assert = require('node:assert/strict')
const { merge } = require('../merge')

describe('merge', function () {
  it('preserves null override values', function () {
    const defaults = { recaptcha: { trustedUsersRegex: 'default' } }

    assert.deepEqual(
      merge({ recaptcha: { trustedUsersRegex: null } }, defaults),
      { recaptcha: { trustedUsersRegex: null } }
    )
  })
})
