import AuthenticationController from '../Authentication/AuthenticationController.mjs'
import RateLimiterMiddleware from '../Security/RateLimiterMiddleware.mjs'
import { RateLimiter } from '../../infrastructure/RateLimiter.mjs'
import UnderleafWelcomeController from './UnderleafWelcomeController.mjs'

const bootstrapRateLimiter = new RateLimiter('underleaf-bootstrap', {
  points: 5,
  duration: 60,
})

function apply(webRouter) {
  AuthenticationController.addEndpointToLoginWhitelist('/welcome')
  webRouter.get('/welcome', UnderleafWelcomeController.welcome)
  webRouter.post(
    '/welcome',
    RateLimiterMiddleware.rateLimit(bootstrapRateLimiter, { ipOnly: true }),
    UnderleafWelcomeController.initialize
  )
  // Mounted after static files, sessions and CSRF; health/internal API routers
  // remain independent so a fresh installation can start normally.
  webRouter.use(UnderleafWelcomeController.requireInitialized)
}

export default { apply }
