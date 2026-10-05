import Mongoose from '../../infrastructure/Mongoose.mjs'
import { User } from '../../models/User.mjs'
import UnderleafUserManager, {
  UnderleafUserError,
} from './UnderleafUserManager.mjs'

const INSTALLATION_ID = 'installation'
const TRANSACTION_OPTIONS = {
  readConcern: { level: 'snapshot' },
  writeConcern: { w: 'majority' },
  readPreference: 'primary',
}

async function getCollection() {
  await Mongoose.connectionPromise
  // The state and User model MUST use the same MongoClient for transactions.
  return Mongoose.connection.db.collection('underleafInstallations')
}

async function ensureState(collection) {
  const state = await collection.findOne({ _id: INSTALLATION_ID })
  if (state) return state
  try {
    await collection.updateOne(
      { _id: INSTALLATION_ID },
      { $setOnInsert: { initialized: false, version: 1, revision: 0 } },
      { upsert: true }
    )
  } catch (error) {
    if (error.code !== 11000) throw error // another request created the singleton
  }
  return await collection.findOne({ _id: INSTALLATION_ID })
}

async function withInstallationLock(callback) {
  const collection = await getCollection()
  await ensureState(collection)
  const session = await Mongoose.connection.startSession()
  try {
    return await session.withTransaction(async () => {
      // All bootstrap writers acquire this singleton before reading users.
      // MongoDB retries conflicting transactions against the committed state.
      await collection.updateOne(
        { _id: INSTALLATION_ID },
        { $inc: { revision: 1 } },
        { session }
      )
      const state = await collection.findOne(
        { _id: INSTALLATION_ID },
        { session }
      )
      return await callback(collection, state, session)
    }, TRANSACTION_OPTIONS)
  } finally {
    await session.endSession()
  }
}

async function markInitialized(collection, userId, source, session) {
  await collection.updateOne(
    { _id: INSTALLATION_ID },
    {
      $set: {
        initialized: true,
        initializedAt: new Date(),
        initializedBy: userId,
        source,
      },
    },
    { session }
  )
}

async function getState() {
  const collection = await getCollection()
  const state = await ensureState(collection)
  if (state.initialized) return { initialized: true }

  return await withInstallationLock(async (collection, state, session) => {
    if (state.initialized) return { initialized: true }
    const existingUser = await User.findOne()
      .select({ _id: 1 })
      .session(session)
      .lean()
    if (existingUser) {
      // Adopt existing installations without ever opening a browser takeover path.
      await markInitialized(collection, null, 'existing-installation', session)
      return { initialized: true }
    }
    return { initialized: false }
  })
}

async function createAdministrator(details, { recovery = false } = {}) {
  return await withInstallationLock(async (collection, state, session) => {
    if (recovery) {
      const admin = await User.exists({
        $or: [{ role: 'admin' }, { isAdmin: true }],
      }).session(session)
      if (admin) {
        throw new UnderleafUserError(
          'administrator_exists',
          'An administrator already exists. Use the admin panel to manage accounts.'
        )
      }
    } else {
      const existingUser = await User.exists({}).session(session)
      if (state.initialized || existingUser) {
        throw new UnderleafUserError(
          'setup_closed',
          'This installation is already initialized.'
        )
      }
    }

    const user = await UnderleafUserManager.createUser(
      { ...details, role: 'admin' },
      { session }
    )
    if (!state.initialized) {
      await markInitialized(
        collection,
        user._id,
        recovery ? 'cli' : 'welcome',
        session
      )
    }
    return user
  })
}

export default {
  getState,
  initialize: details => createAdministrator(details),
  // Never expose recovery through a browser route. It requires operator access.
  recoverAdministrator: details =>
    createAdministrator(details, { recovery: true }),
}
