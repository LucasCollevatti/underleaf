// These URLs belonged to email identity, public signup, or institutional accounts.
// Keep explicit tombstones so enabling an inherited module cannot restore them.
export default {
  apply(webRouter) {
    webRouter.use(
      [
        '/register',
        '/registration',
        '/launchpad',
        '/user/password/reset',
        '/user/password/set',
        '/user/reconfirm',
        '/user/emails',
        '/user/email-preferences',
        '/user/newsletter',
        '/user/subscription',
        '/subscription',
        '/user/bonus',
        '/user/affiliations',
        '/user/activate',
        '/read-only/one-time-login',
        '/compromised-password',
        '/manage/groups',
        '/manage/institutions',
        '/manage/publishers',
        '/entities/institution/create',
        '/entities/publisher/create',
      ],
      (req, res) => res.sendStatus(404)
    )
  },
}
