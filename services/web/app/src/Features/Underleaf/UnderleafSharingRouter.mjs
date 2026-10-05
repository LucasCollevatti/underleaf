import AuthenticationController from '../Authentication/AuthenticationController.mjs'
import AuthorizationMiddleware from '../Authorization/AuthorizationMiddleware.mjs'
import UnderleafSharingController from './UnderleafSharingController.mjs'
import { RateLimiter } from '../../infrastructure/RateLimiter.mjs'
import RateLimiterMiddleware from '../Security/RateLimiterMiddleware.mjs'

const searchLimiter = new RateLimiter('underleaf-user-search', {
  points: 120,
  duration: 60,
})
const shareLimiter = new RateLimiter('underleaf-direct-sharing', {
  points: 100,
  duration: 60,
})

export default {
  apply(webRouter) {
    webRouter.get(
      '/underleaf/users/search',
      AuthenticationController.requireLogin(),
      RateLimiterMiddleware.rateLimit(searchLimiter),
      UnderleafSharingController.searchUsers
    )

    webRouter.put(
      '/project/:Project_id/users/by-username',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      RateLimiterMiddleware.rateLimit(shareLimiter),
      UnderleafSharingController.addUserByUsername
    )

    webRouter.delete(
      '/project/:Project_id/users/by-username/:username',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      UnderleafSharingController.removeUserByUsername
    )
  },
}
