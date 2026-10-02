import AuthenticationController from '../Authentication/AuthenticationController.mjs'
import AuthorizationMiddleware from '../Authorization/AuthorizationMiddleware.mjs'
import UnderleafSharingController from './UnderleafSharingController.mjs'

export default {
  apply(webRouter) {
    webRouter.get(
      '/underleaf/users/search',
      AuthenticationController.requireLogin(),
      UnderleafSharingController.searchUsers
    )

    webRouter.put(
      '/project/:Project_id/users/by-username',
      AuthenticationController.requireLogin(),
      AuthorizationMiddleware.ensureUserCanAdminProject,
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
