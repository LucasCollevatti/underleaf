import { callbackify } from 'node:util'
import UnderleafUserManager from '../Underleaf/UnderleafUserManager.mjs'

// Internal scripts and fixtures share the same account validation as admin setup.
const createNewUser = UnderleafUserManager.createUser

export default {
  createNewUser: callbackify(createNewUser),
  promises: { createNewUser },
}
