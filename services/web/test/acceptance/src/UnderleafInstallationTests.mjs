import { expect } from 'chai'
import sinon from 'sinon'
import Settings from '@overleaf/settings'
import Mongoose from '../../../app/src/infrastructure/Mongoose.mjs'
import { User } from '../../../app/src/models/User.mjs'
import UnderleafUserManager from '../../../app/src/Features/Underleaf/UnderleafUserManager.mjs'
import UnderleafInstallationManager from '../../../app/src/Features/Underleaf/UnderleafInstallationManager.mjs'

// Uses the acceptance suite's disposable MongoDB replica set, never production data.
describe('Underleaf installation transactions', function () {
  let states
  const credentials = {
    username: 'first-admin',
    password: 'strong-bootstrap-secret',
  }

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

  it('creates a valid administrator and durable installation together', async function () {
    expect(await UnderleafInstallationManager.getState()).to.deep.equal({
      initialized: false,
    })
    const user = await UnderleafInstallationManager.initialize({
      ...credentials,
      role: 'user',
    })
    expect(user.role).to.equal('admin')
    expect(user.isAdmin).to.equal(true)
    expect(user.status).to.equal('active')
    expect(user.passwordHash).not.to.equal(credentials.password)
    expect(
      (
        await UnderleafUserManager.authenticate(
          credentials.username,
          credentials.password
        )
      ).user._id.toString()
    ).to.equal(user._id.toString())
    const state = await states.findOne({ _id: 'installation' })
    expect(state.initialized).to.equal(true)
    expect(state.initializedBy.toString()).to.equal(user._id.toString())
    expect(state.initializedAt).to.be.instanceOf(Date)
  })

  it('allows exactly one concurrent browser bootstrap', async function () {
    const results = await Promise.allSettled([
      UnderleafInstallationManager.initialize(credentials),
      UnderleafInstallationManager.initialize({
        ...credentials,
        username: 'second-admin',
      }),
    ])
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).to.have.length(1)
    expect(
      results.find(result => result.status === 'rejected').reason.code
    ).to.equal('setup_closed')
    expect(await User.countDocuments()).to.equal(1)
    expect(await UnderleafInstallationManager.getState()).to.deep.equal({
      initialized: true,
    })
  })

  it('serializes CLI automation against browser bootstrap', async function () {
    const results = await Promise.allSettled([
      UnderleafInstallationManager.initialize(credentials),
      UnderleafInstallationManager.recoverAdministrator({
        ...credentials,
        username: 'cli-admin',
      }),
    ])
    expect(
      results.filter(result => result.status === 'fulfilled')
    ).to.have.length(1)
    expect(await User.countDocuments()).to.equal(1)
  })

  it('rolls back both state and a saved user if bootstrap fails', async function () {
    const createUser = UnderleafUserManager.createUser
    sinon
      .stub(UnderleafUserManager, 'createUser')
      .callsFake(async (...args) => {
        await createUser(...args)
        throw new Error('Simulated failure after user insert')
      })
    let failure
    try {
      await UnderleafInstallationManager.initialize(credentials)
    } catch (error) {
      failure = error
    }
    expect(failure.message).to.equal('Simulated failure after user insert')
    expect(await User.countDocuments()).to.equal(0)
    expect(await UnderleafInstallationManager.getState()).to.deep.equal({
      initialized: false,
    })
    sinon.restore()
    await UnderleafInstallationManager.initialize(credentials)
    expect(await User.countDocuments()).to.equal(1)
  })

  it('rejects invalid credentials without initializing or saving users', async function () {
    for (const details of [
      { ...credentials, username: 'bad username' },
      { ...credentials, password: 'short' },
    ]) {
      let failure
      try {
        await UnderleafInstallationManager.initialize(details)
      } catch (error) {
        failure = error
      }
      expect(failure).to.be.instanceOf(Error)
      expect(await User.countDocuments()).to.equal(0)
      expect(await UnderleafInstallationManager.getState()).to.deep.equal({
        initialized: false,
      })
    }
  })

  it('adopts an existing installation with users but no administrator', async function () {
    await UnderleafUserManager.createUser({ ...credentials, role: 'user' })
    expect(await UnderleafInstallationManager.getState()).to.deep.equal({
      initialized: true,
    })
    let failure
    try {
      await UnderleafInstallationManager.initialize({
        ...credentials,
        username: 'takeover-admin',
      })
    } catch (error) {
      failure = error
    }
    expect(failure.code).to.equal('setup_closed')
    expect(await User.countDocuments({ isAdmin: true })).to.equal(0)
    await UnderleafInstallationManager.recoverAdministrator({
      ...credentials,
      username: 'recovery-admin',
    })
    expect(await User.countDocuments({ isAdmin: true })).to.equal(1)
    expect((await states.findOne({ _id: 'installation' })).source).to.equal(
      'existing-installation'
    )
  })

  it('does not reopen setup after all users are removed', async function () {
    await UnderleafInstallationManager.initialize(credentials)
    await User.deleteMany({})
    expect(await UnderleafInstallationManager.getState()).to.deep.equal({
      initialized: true,
    })
    let failure
    try {
      await UnderleafInstallationManager.initialize(credentials)
    } catch (error) {
      failure = error
    }
    expect(failure.code).to.equal('setup_closed')
    await UnderleafInstallationManager.recoverAdministrator(credentials)
    expect(await UnderleafInstallationManager.getState()).to.deep.equal({
      initialized: true,
    })
  })

  it('refuses CLI recovery when a disabled administrator exists', async function () {
    const admin = await UnderleafInstallationManager.initialize(credentials)
    await User.updateOne({ _id: admin._id }, { $set: { status: 'disabled' } })
    let failure
    try {
      await UnderleafInstallationManager.recoverAdministrator({
        ...credentials,
        username: 'replacement',
      })
    } catch (error) {
      failure = error
    }
    expect(failure.code).to.equal('administrator_exists')
    expect(await User.countDocuments()).to.equal(1)
  })
})
