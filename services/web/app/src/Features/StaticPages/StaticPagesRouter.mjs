import SessionManager from '../Authentication/SessionManager.mjs'

export default {
  apply(webRouter) {
    webRouter.get('/', (req, res) => {
      if (SessionManager.isUserLoggedIn(req.session)) {
        res.redirect('/project')
      } else {
        res.redirect('/login')
      }
    })
    webRouter.get('/home', (_req, res) => res.redirect('/login'))
  },
}
