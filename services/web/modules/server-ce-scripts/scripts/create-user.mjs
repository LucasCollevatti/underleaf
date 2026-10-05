import minimist from 'minimist'
import { fileURLToPath } from 'node:url'
import UserManager from '../../../app/src/Features/Underleaf/UnderleafUserManager.mjs'
import InstallationManager from '../../../app/src/Features/Underleaf/UnderleafInstallationManager.mjs'

const filename = fileURLToPath(import.meta.url)

export default async function main() {
  const argv = minimist(process.argv.slice(2), {
    string: ['username', 'display-name'],
    boolean: ['admin'],
  })
  const password = process.env.UNDERLEAF_PASSWORD
  if (!argv.username || !password) {
    throw new Error(
      `Usage: UNDERLEAF_PASSWORD='<password>' node ${filename} [--admin] --username=account [--display-name='Name']`
    )
  }
  const details = {
    username: argv.username,
    displayName: argv['display-name'],
    password,
  }
  const user = argv.admin
    ? await InstallationManager.recoverAdministrator(details)
    : await UserManager.createUser(details)
  console.log(`Created ${user.role} account @${user.username}.`)
}

if (filename === process.argv[1]) {
  try {
    await main()
    process.exit(0)
  } catch (error) {
    console.error(error.message)
    process.exit(1)
  }
}
