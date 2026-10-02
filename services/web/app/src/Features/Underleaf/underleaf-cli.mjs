import readline from 'node:readline/promises'
import process from 'node:process'
import Mongoose from '../../infrastructure/Mongoose.mjs'
import { User } from '../../models/User.mjs'
import UnderleafUserManager from './UnderleafUserManager.mjs'

const COMMAND_NAME = 'create-admin'

function askVisible(question) {
  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  return prompt.question(question).finally(() => prompt.close())
}

function askSecret(question) {
  return new Promise((resolve, reject) => {
    let value = ''

    const finish = (error, result) => {
      process.stdin.setRawMode(false)
      process.stdin.pause()
      process.stdin.removeListener('data', onData)
      process.stdout.write('\n')
      if (error) reject(error)
      else resolve(result)
    }

    const onData = chunk => {
      const input = chunk.toString()
      if (input === '\u0003') {
        finish(new Error('Input cancelled.'))
        return
      }
      if (input === '\r' || input === '\n') {
        finish(null, value)
        return
      }
      if (input === '\u007f') {
        value = value.slice(0, -1)
        return
      }
      value += input
    }

    process.stdout.write(question)
    process.stdin.setRawMode(true)
    process.stdin.resume()
    process.stdin.on('data', onData)
  })
}

async function askCredentials() {
  if (!process.stdin.isTTY) {
    process.stdout.write('Username: Password: Confirm password: ')
    const input = await readPipedInput()
    const [username, password, confirmation] = input.split(/\r?\n/)
    return { username, password, confirmation }
  }

  return {
    username: await askVisible('Username: '),
    password: await askSecret('Password: '),
    confirmation: await askSecret('Confirm password: '),
  }
}

function readPipedInput() {
  return new Promise((resolve, reject) => {
    const chunks = []
    process.stdin.on('data', chunk => chunks.push(chunk))
    process.stdin.on('end', () => resolve(Buffer.concat(chunks).toString()))
    process.stdin.on('error', reject)
  })
}

async function ensureNoAdminExists() {
  const existingAdmin = await User.exists({
    $or: [{ role: 'admin' }, { isAdmin: true }],
  })
  if (existingAdmin) {
    throw new Error(
      'An administrator already exists. Use the admin panel to manage accounts.'
    )
  }
}

async function createAdmin() {
  await ensureNoAdminExists()

  const { username, password, confirmation } = await askCredentials()

  if (password !== confirmation) {
    throw new Error('Passwords do not match.')
  }

  const user = await UnderleafUserManager.createUser({
    username,
    password,
    role: 'admin',
  })
  console.log(`Administrator ${user.username} created.`)
}

async function disconnectMongo() {
  try {
    await Mongoose.disconnect()
  } catch (error) {
    console.error(`Failed to close the MongoDB connection: ${error.message}`)
  }
}

async function main() {
  if (process.argv[2] !== COMMAND_NAME) {
    throw new Error(`Usage: underleaf ${COMMAND_NAME}`)
  }

  await createAdmin()
}

try {
  await main()
  await disconnectMongo()
  process.exit(0)
} catch (error) {
  console.error(error.message)
  await disconnectMongo()
  process.exit(1)
}
