import { expect } from 'chai'
import sinon from 'sinon'
import Settings from '@overleaf/settings'
import Mongoose from '../../../app/src/infrastructure/Mongoose.mjs'
import { User } from '../../../app/src/models/User.mjs'
import UserManager from '../../../app/src/Features/Underleaf/UnderleafUserManager.mjs'
import Installation from '../../../app/src/Features/Underleaf/UnderleafInstallationManager.mjs'
import UserDeleter from '../../../app/src/Features/User/UserDeleter.mjs'

// Real transactional guards on the acceptance harness's disposable replica set.
// Project/Redis cleanup is stubbed separately; it must never run in a retried transaction.
describe('Underleaf administrator safety transactions', function () {
  let states

  before(async function () {
    if (!Settings.underleaf) this.skip()
    await Mongoose.connectionPromise
    states = Mongoose.connection.db.collection('underleafInstallations')
  })
  beforeEach(async function () {
    await states.deleteMany({})
    await User.deleteMany({})
  })
  afterEach(async function () {
    sinon.restore()
    await states.deleteMany({})
    await User.deleteMany({})
  })

  async function administrators() {
    const first = await Installation.initialize({
      username: 'admin-first',
      password: 'strong-admin-secret',
    })
    const second = await UserManager.createUser({
      username: 'admin-second',
      password: 'strong-admin-secret',
      role: 'admin',
    })
    return [first, second]
  }

  function expectSingleRemoval(results) {
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).to.have.length(1)
    const failures = results.filter(result => result.status === 'rejected')
    expect(failures).to.have.length(1)
    expect(failures[0].reason.code).to.equal('last_admin')
  }

  async function expectActiveAdministrator() {
    expect(
      await User.countDocuments({
        role: 'admin',
        status: 'active',
        suspended: { $ne: true },
      })
    ).to.equal(1)
    expect(await Installation.getState()).to.deep.equal({ initialized: true })
  }

  for (const [name, firstChange, secondChange] of [
    [
      'disabling both administrators',
      { status: 'disabled' },
      { status: 'disabled' },
    ],
    ['demoting both administrators', { role: 'user' }, { role: 'user' }],
    [
      'disabling one administrator while demoting the other',
      { status: 'disabled' },
      { role: 'user' },
    ],
  ]) {
    it(`keeps an active administrator when ${name} concurrently`, async function () {
      const [first, second] = await administrators()
      const results = await Promise.allSettled([
        UserManager.updateUser(first._id, firstChange),
        UserManager.updateUser(second._id, secondChange),
      ])
      expectSingleRemoval(results)
      await expectActiveAdministrator()
    })
  }

  for (const competingOperation of ['disable', 'demote', 'delete']) {
    it(`serializes deletion against a concurrent administrator ${competingOperation}`, async function () {
      const [first, second] = await administrators()
      const cleanup = sinon
        .stub(UserDeleter.promises, 'deleteUser')
        .callsFake(async userId => {
          const account = await User.findById(userId).lean()
          expect(account).to.include({
            deletionPending: true,
            status: 'disabled',
            suspended: true,
          })
          await User.deleteOne({ _id: userId })
        })
      const deletion = user =>
        UserManager.deleteUser(user._id, { deleteProjects: false })
      const results = await Promise.allSettled([
        deletion(first),
        competingOperation === 'delete'
          ? deletion(second)
          : UserManager.updateUser(
              second._id,
              competingOperation === 'disable'
                ? { status: 'disabled' }
                : { role: 'user' }
            ),
      ])
      expectSingleRemoval(results)
      await expectActiveAdministrator()
      expect(cleanup.callCount).to.be.at.most(1)
    })
  }

  it('rejects deletion of the sole active administrator before cleanup or account changes', async function () {
    const [first, second] = await administrators()
    await UserManager.updateUser(second._id, { status: 'disabled' })
    const before = await User.findById(first._id).lean()
    const stateBefore = await states.findOne({ _id: 'installation' })
    const cleanup = sinon.stub(UserDeleter.promises, 'deleteUser')
    let failure
    try {
      await UserManager.deleteUser(first._id, { deleteProjects: false })
    } catch (error) {
      failure = error
    }
    expect(failure?.code).to.equal('last_admin')
    expect(cleanup.called).to.equal(false)
    expect(await User.findById(first._id).lean()).to.deep.equal(before)
    expect(await states.findOne({ _id: 'installation' })).to.deep.equal(
      stateBefore
    )
    await expectActiveAdministrator()
  })

  it('keeps failed deletion disabled, blocks reactivation and allows explicit cleanup retry', async function () {
    const [first, second] = await administrators()
    const cleanup = sinon.stub(UserDeleter.promises, 'deleteUser')
    cleanup.onFirstCall().rejects(new Error('Cleanup service unavailable'))
    cleanup.onSecondCall().callsFake(async userId => {
      await User.deleteOne({ _id: userId })
    })
    let failure
    try {
      await UserManager.deleteUser(first._id, { deleteProjects: false })
    } catch (error) {
      failure = error
    }
    expect(failure?.message).to.equal('Cleanup service unavailable')
    const pending = await User.findById(first._id).lean()
    expect(pending).to.include({
      deletionPending: true,
      status: 'disabled',
      suspended: true,
      identityVersion: first.identityVersion + 1,
    })
    expect(
      (await UserManager.authenticate(first.username, 'strong-admin-secret'))
        .user
    ).to.equal(null)
    for (const changes of [
      { status: 'active' },
      { role: 'admin' },
      { password: 'replacement-admin-secret' },
      { displayName: 'Changed name' },
    ]) {
      let error
      try {
        await UserManager.updateUser(first._id, changes)
      } catch (cause) {
        error = cause
      }
      expect(error?.code).to.equal('deletion_pending')
    }
    let lastAdminFailure
    try {
      await UserManager.updateUser(second._id, { status: 'disabled' })
    } catch (error) {
      lastAdminFailure = error
    }
    expect(lastAdminFailure?.code).to.equal('last_admin')
    await UserManager.deleteUser(first._id, { deleteProjects: false })
    expect(cleanup.callCount).to.equal(2)
    expect(await User.findById(first._id)).to.equal(null)
    await expectActiveAdministrator()
  })
})
