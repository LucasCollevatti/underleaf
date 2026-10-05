export function sanitizeSessionUserForFrontEnd(sessionUser) {
  if (sessionUser != null) {
    return {
      username: sessionUser.username,
      displayName: sessionUser.displayName,
      role: sessionUser.role,
      status: sessionUser.status,
      first_name: sessionUser.first_name,
      last_name: sessionUser.last_name,
    }
  }

  return null
}
