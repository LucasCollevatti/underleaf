import {
  INSTALLATION_ID,
  readInstallationState,
  withInstallationLock,
} from './UnderleafInstallationLock.mjs'
import { User } from '../../models/User.mjs'
import UnderleafUserManager, {
  UnderleafUserError,
} from './UnderleafUserManager.mjs'

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
  const state = await readInstallationState()
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
