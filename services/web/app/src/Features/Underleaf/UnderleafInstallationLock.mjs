import Mongoose from '../../infrastructure/Mongoose.mjs'

export const INSTALLATION_ID = 'installation'
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

export async function withInstallationLock(callback) {
  const collection = await getCollection()
  await ensureState(collection)
  const session = await Mongoose.connection.startSession()
  try {
    return await session.withTransaction(async () => {
      // Bootstrap, role/status changes and deletion reservations share this lock.
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

export async function readInstallationState() {
  return await ensureState(await getCollection())
}
