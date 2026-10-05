export const buildName = (user: {
  first_name?: string
  last_name?: string
  username?: string
  displayName?: string
}) => {
  if (user.displayName?.trim()) return user.displayName.trim()
  const name = [user.first_name, user.last_name].filter(Boolean).join(' ')

  if (name) {
    return name
  }

  if (user.username) return user.username

  return 'Unknown'
}
