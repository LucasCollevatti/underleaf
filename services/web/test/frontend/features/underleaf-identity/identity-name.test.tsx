import { expect } from 'chai'
import { buildName } from '../../../../frontend/js/shared/utils/build-name'
import { formatUserName } from '../../../../frontend/js/features/history/utils/history-details'

describe('Username identity display', function () {
  it('shows displayName without requiring email in the editor and history', function () {
    const user = { username: 'alice', displayName: 'Alice Cooper' }
    expect(buildName(user)).to.equal('Alice Cooper')
    expect(formatUserName(user)).to.equal('Alice Cooper')
  })

  it('uses username when a user has no display name or legacy name', function () {
    const user = { username: 'alice' }
    expect(buildName(user)).to.equal('alice')
    expect(formatUserName(user)).to.equal('alice')
  })

  it('keeps legacy names readable without an email fallback', function () {
    const user = { username: 'alice', first_name: 'Alice', last_name: 'Cooper' }
    expect(buildName(user)).to.equal('Alice Cooper')
    expect(formatUserName(user)).to.equal('Alice Cooper')
  })

  it('handles deleted historical users without throwing', function () {
    expect(buildName({})).to.equal('Unknown')
    expect(formatUserName({})).to.equal('?')
  })
})
