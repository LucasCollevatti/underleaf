import { expect } from 'chai'
import bcrypt from 'bcrypt'
import Mongoose from '../../../app/src/infrastructure/Mongoose.mjs'
import UserManager from '../../../app/src/Features/Underleaf/UnderleafUserManager.mjs'
import Authentication from '../../../app/src/Features/Authentication/AuthenticationController.mjs'
import AuthenticationManager from '../../../app/src/Features/Authentication/AuthenticationManager.mjs'
import SessionManager from '../../../app/src/Features/Authentication/SessionManager.mjs'
import { sanitizeSessionUserForFrontEnd } from '../../../app/src/infrastructure/FrontEndUser.mjs'
import migration from '../../../../../tools/migrations/20261005100000_underleaf_username_identity.mjs'
import accountMigration from '../../../../../tools/migrations/20261002100000_underleaf_username_accounts.mjs'

describe('Underleaf username identity', function () {
  let db, collections, hash
  before(async function () {
    await Mongoose.connectionPromise
    db = Mongoose.connection.db
    collections = Object.fromEntries(
      ['users', 'deletedUsers', 'tokens', 'projects'].map(name => [
        name,
        db.collection(name),
      ])
    )
    hash = await bcrypt.hash('old-account-secret', 4)
  })
  beforeEach(async function () {
    for (const collection of Object.values(collections)) {
      await collection.deleteMany({})
      await collection.dropIndexes().catch(error => {
        if (error.code !== 26) throw error
      })
    }
  })
  afterEach(async function () {
    for (const collection of Object.values(collections))
      await collection.deleteMany({})
  })

  it('runs both username migrations without creating artificial case conflicts', async function () {
    const ids = [new Mongoose.Types.ObjectId(), new Mongoose.Types.ObjectId()]
    await collections.users.insertMany([
      { _id: ids[0], username: 'Alpha', hashedPassword: hash },
      { _id: ids[1], email: 'alpha@example.org', hashedPassword: hash },
    ])
    await accountMigration.migrate({ db: collections })
    await migration.migrate({ db: collections })
    expect(
      (await collections.users.findOne({ _id: ids[0] })).username
    ).to.equal('alpha')
    expect(
      (await collections.users.findOne({ _id: ids[1] })).username
    ).to.equal('alpha-1')
    expect(
      (await collections.users.indexes()).find(
        index => index.name === 'username_1'
      ).sparse
    ).not.to.equal(true)
  })

  it('preflights normalized conflicts before the earlier migration writes anything', async function () {
    await collections.users.insertMany([
      { username: 'Alpha', email: 'a@example.org', hashedPassword: hash },
      { username: ' alpha ', email: 'b@example.org', hashedPassword: hash },
    ])
    const before = await collections.users.find({}).toArray()
    try {
      await accountMigration.migrate({ db: collections })
      throw new Error('expected conflict')
    } catch (error) {
      expect(error.message).to.include('Conflicting username')
    }
    expect(await collections.users.find({}).toArray()).to.deep.equal(before)
  })

  it('migrates every account, keeps IDs/projects/passwords and removes email indexes', async function () {
    const id = new Mongoose.Types.ObjectId()
    await collections.users.insertMany([
      {
        _id: id,
        username: ' Existing-Admin ',
        email: 'existing@underleaf.local',
        emails: [{ email: 'existing@underleaf.local' }],
        hashedPassword: hash,
        isAdmin: true,
        first_name: 'Existing',
        last_name: 'Admin',
      },
      { email: 'other@example.org', hashedPassword: hash, suspended: true },
      { email: 'sso@example.org', role: 'student' },
    ])
    await collections.users.createIndex({ email: 1 }, { unique: true })
    await collections.users.createIndex({ 'emails.email': 1 }, { sparse: true })
    await collections.projects.insertOne({
      owner_ref: id,
      collaberator_refs: [id],
    })
    await migration.migrate({ db: collections })
    const user = await collections.users.findOne({ _id: id })
    expect(user).to.include({
      username: 'existing-admin',
      role: 'admin',
      status: 'active',
      displayName: 'Existing Admin',
      passwordHash: hash,
    })
    for (const account of await collections.users.find({}).toArray()) {
      for (const key of [
        'email',
        'emails',
        'hashedPassword',
        'password',
        'must_reconfirm',
      ])
        expect(account).not.to.have.property(key)
    }
    expect(
      (await collections.users.findOne({ username: 'sso' })).status
    ).to.equal('disabled')
    expect(
      (await collections.users.findOne({ username: 'other' })).status
    ).to.equal('disabled')
    const project = await collections.projects.findOne({})
    expect(String(project.owner_ref)).to.equal(String(id))
    expect(String(project.collaberator_refs[0])).to.equal(String(id))
    const indexes = await collections.users.indexes()
    expect(indexes.map(index => index.name)).to.deep.equal([
      '_id_',
      'username_1',
    ])
    expect(indexes[1].unique).to.equal(true)
    expect(indexes[1].sparse).not.to.equal(true)
    expect(
      (
        await UserManager.authenticate(' EXISTING-ADMIN ', 'old-account-secret')
      ).user._id.toString()
    ).to.equal(String(id))
  })

  it('assigns names deterministically and reserves existing usernames first', async function () {
    const ids = [
      new Mongoose.Types.ObjectId('000000000000000000000001'),
      new Mongoose.Types.ObjectId('000000000000000000000002'),
    ]
    await collections.users.insertMany([
      { _id: ids[1], email: 'same@b.example', hashedPassword: hash },
      { _id: ids[0], email: 'same@a.example', hashedPassword: hash },
      { username: 'same', passwordHash: hash },
      { email: 'x@example.org', hashedPassword: hash },
    ])
    await migration.migrate({ db: collections })
    expect(
      (await collections.users.findOne({ _id: ids[0] })).username
    ).to.equal('same-1')
    expect(
      (await collections.users.findOne({ _id: ids[1] })).username
    ).to.equal('same-2')
    expect(
      await collections.users.countDocuments({ username: /^user-/ })
    ).to.equal(1)
  })

  it('fails duplicate-name preflight before changing any document or index', async function () {
    await collections.users.insertMany([
      { username: 'Admin', email: 'one@a.example' },
      { username: ' admin ', email: 'two@a.example' },
    ])
    await collections.users.createIndex({ email: 1 }, { unique: true })
    const before = await collections.users.find({}).toArray()
    try {
      await migration.migrate({ db: collections })
      throw new Error('expected conflict')
    } catch (error) {
      expect(error.message).to.include('Conflicting username')
    }
    expect(await collections.users.find({}).toArray()).to.deep.equal(before)
    expect(
      (await collections.users.indexes()).map(index => index.name)
    ).to.include('email_1')
  })

  it('is idempotent, redacts deleted snapshots and invalidates old recovery tokens', async function () {
    await collections.users.insertOne({
      email: 'old@example.org',
      hashedPassword: hash,
    })
    await collections.deletedUsers.insertOne({
      user: {
        email: 'old@example.org',
        emails: [{ email: 'old@example.org' }],
        hashedPassword: hash,
      },
    })
    await collections.deletedUsers.createIndex({ 'user.email': 1 })
    await collections.tokens.insertMany([
      { use: 'password', data: { user_id: 'id' } },
      { use: 'email_confirmation', data: { email: 'old@example.org' } },
      { use: 'other', data: {} },
    ])
    await migration.migrate({ db: collections })
    const first = await collections.users.findOne({})
    await migration.migrate({ db: collections })
    expect(await collections.users.findOne({})).to.deep.equal(first)
    expect((await collections.deletedUsers.findOne({})).user).to.deep.equal({})
    expect(await collections.tokens.countDocuments({})).to.equal(1)
    expect(
      (await collections.deletedUsers.indexes()).map(index => index.name)
    ).to.deep.equal(['_id_'])
  })

  it('creates multiple email-free users under the unique username index', async function () {
    await migration.migrate({ db: collections })
    await UserManager.createUser({
      username: 'Alpha',
      password: 'new-account-secret',
    })
    await UserManager.createUser({
      username: 'bravo',
      password: 'new-account-secret',
    })
    for (const user of await collections.users.find({}).toArray()) {
      expect(user).to.have.property('passwordHash')
      for (const key of ['email', 'emails', 'hashedPassword'])
        expect(user).not.to.have.property(key)
    }
    try {
      await UserManager.createUser({
        username: ' ALPHA ',
        password: 'new-account-secret',
      })
      throw new Error('expected duplicate')
    } catch (error) {
      expect(error.code).to.equal('username_taken')
    }
    expect(
      (
        await UserManager.authenticate(
          'alpha@underleaf.local',
          'new-account-secret'
        )
      ).user
    ).to.equal(null)
    expect(
      (
        await AuthenticationManager.promises.authenticate(
          { email: 'alpha' },
          'new-account-secret',
          null,
          { enforceHIBPCheck: false }
        )
      ).user
    ).to.equal(null)
  })

  it('counts all owned projects in administration, including inactive and trashed entries', async function () {
    const user = await UserManager.createUser({
      username: 'project-owner',
      password: 'strong-account-secret',
    })
    await collections.projects.insertMany([
      { owner_ref: user._id, active: true },
      { owner_ref: user._id, active: false, archived: true },
      { owner_ref: user._id, active: true, trashed: true },
      { owner_ref: new Mongoose.Types.ObjectId(), active: true },
    ])
    expect(await UserManager.countOwnedProjects(user._id)).to.equal(3)
    const listed = (await UserManager.listUsers()).find(account =>
      account._id.equals(user._id)
    )
    expect(listed.projectCount).to.equal(3)
    expect(listed).not.to.have.property('passwordHash')
  })

  it('administrator reset replaces the canonical hash and invalidates prior sessions', async function () {
    const user = await UserManager.createUser({
      username: 'reset-user',
      password: 'old-account-secret',
    })
    const serialized = await new Promise((resolve, reject) =>
      Authentication.serializeUser(user, (error, result) =>
        error ? reject(error) : resolve(result)
      )
    )
    expect(serialized).not.to.have.property('email')
    const updated = await UserManager.updateUser(user._id, {
      password: 'new-account-secret',
    })
    expect(updated.identityVersion).to.equal(user.identityVersion + 1)
    expect(
      (await UserManager.authenticate('reset-user', 'old-account-secret')).user
    ).to.equal(null)
    expect(
      (
        await UserManager.authenticate('reset-user', 'new-account-secret')
      ).user._id.toString()
    ).to.equal(String(user._id))
    const oldSession = await new Promise((resolve, reject) =>
      Authentication.deserializeUser(serialized, (error, result) =>
        error ? reject(error) : resolve(result)
      )
    )
    expect(oldSession).to.equal(false)
  })

  it('refreshes names in sessions and rejects pre-migration sessions', async function () {
    const user = await UserManager.createUser({
      username: 'session-user',
      password: 'old-account-secret',
    })
    const session = await new Promise((resolve, reject) =>
      Authentication.serializeUser(user, (error, result) =>
        error ? reject(error) : resolve(result)
      )
    )
    await UserManager.updateUser(user._id, { displayName: 'New display name' })
    const current = await new Promise((resolve, reject) =>
      Authentication.deserializeUser(session, (error, result) =>
        error ? reject(error) : resolve(result)
      )
    )
    expect(current.displayName).to.equal('New display name')
    expect(session.displayName).to.equal('New display name')
    const req = { session: { passport: { user: session } } }
    let continued = false
    Authentication.requireLogin()(req, {}, () => {
      continued = true
    })
    expect(continued).to.equal(true)
    expect(req.user.displayName).to.equal('New display name')
    expect(sanitizeSessionUserForFrontEnd(current))
      .to.include({ username: 'session-user', displayName: 'New display name' })
      .and.not.to.have.property('email')
    expect(
      SessionManager.getSessionUser({
        passport: { user: { _id: user._id, email: 'old@example.org' } },
      })
    ).to.equal(null)
  })

  it('rejects disabled accounts and bcrypt byte truncation', async function () {
    const user = await UserManager.createUser({
      username: 'disabled-user',
      password: 'old-account-secret',
    })
    await UserManager.updateUser(user._id, { status: 'disabled' })
    expect(
      (await UserManager.authenticate('disabled-user', 'old-account-secret'))
        .reason
    ).to.equal('disabled')
    expect(AuthenticationManager.validatePassword('£'.repeat(37))).not.to.equal(
      null
    )
  })
})
