import CollaboratorsController from './CollaboratorsController.mjs'
import AuthenticationController from '../Authentication/AuthenticationController.mjs'
import AuthorizationMiddleware from '../Authorization/AuthorizationMiddleware.mjs'
import { RateLimiter } from '../../infrastructure/RateLimiter.mjs'
import RateLimiterMiddleware from '../Security/RateLimiterMiddleware.mjs'

const rateLimiters = {
  getProjectTokens: new RateLimiter('get-project-tokens', {
    points: 200,
    duration: 60 * 10,
  }),
  requestAccess: new RateLimiter('request-access', {
    points: 10,
    duration: 60 * 10,
  }),
}

export default {
  apply(webRouter) {
    webRouter.post(
      '/project/:Project_id/leave',
      AuthenticationController.requireLogin(),
      CollaboratorsController.removeSelfFromProject
    )

    webRouter.put(
      '/project/:Project_id/users/:user_id',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      CollaboratorsController.setCollaboratorInfo
    )

    webRouter.delete(
      '/project/:Project_id/users/:user_id',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      CollaboratorsController.removeUserFromProject
    )

    webRouter.get(
      '/project/:Project_id/members',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.blockRestrictedUserFromProject,
      AuthorizationMiddleware.ensureUserCanReadProject,
      CollaboratorsController.getAllMembers
    )

    webRouter.post(
      '/project/:Project_id/request-access',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanReadProject,
      RateLimiterMiddleware.rateLimit(rateLimiters.requestAccess, {
        params: ['Project_id'],
      }),
      CollaboratorsController.requestAccess
    )

    webRouter.get(
      '/project/:Project_id/access-requests',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      CollaboratorsController.getAccessRequests
    )

    webRouter.delete(
      '/project/:Project_id/access-requests/:user_id',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      CollaboratorsController.declineAccessRequest
    )

    webRouter.post(
      '/project/:Project_id/access-requests/:user_id/grant',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      CollaboratorsController.grantAccessRequest
    )

    webRouter.post(
      '/project/:Project_id/transfer-ownership',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
      CollaboratorsController.transferOwnership
    )

    webRouter.get(
      '/project/:Project_id/tokens',
      RateLimiterMiddleware.rateLimit(rateLimiters.getProjectTokens),
      AuthorizationMiddleware.ensureUserCanReadProject,
      CollaboratorsController.getShareTokens
    )
  },
}
