import { expect } from 'chai'
import Settings from '@overleaf/settings'
import Mongoose from '../../../app/src/infrastructure/Mongoose.mjs'
import { User } from '../../../app/src/models/User.mjs'
import request from './helpers/request.js'

describe('Underleaf first-run HTTP flow', function () {
  let states, client, csrfToken
  const credentials = {
    username: 'welcome-admin',
    password: 'strong-bootstrap-secret',
    confirmPassword: 'strong-bootstrap-secret',
  }

  before(async function () {
    if (!Settings.underleaf) this.skip()
    await Mongoose.connectionPromise
    states = Mongoose.connection.db.collection('underleafInstallations')
  })

  beforeEach(async function () {
    await states.deleteMany({})
    await User.deleteMany({})
    client = request.defaults({ jar: request.jar() })
    csrfToken = undefined
  })

  afterEach(async function () {
    await states.deleteMany({})
    await User.deleteMany({})
  })

  function send(method, url, body, headers = {}) {
    return new Promise((resolve, reject) => {
      client({ method, url, json: body, headers }, (error, response) => {
        if (error) reject(error)
        else resolve(response)
      })
    })
  }

  async function welcome() {
    const response = await send('GET', '/welcome')
    expect(response.statusCode).to.equal(200)
    expect(response.headers['cache-control']).to.equal('no-store')
    csrfToken = response.body.match(
      /<meta[^>]*name="ol-csrfToken"[^>]*content="([^"]+)"/
    )[1]
  }

  it('redirects fresh pages to Welcome while healthchecks remain available', async function () {
    for (const url of ['/', '/login', '/project']) {
      const response = await send('GET', url)
      expect(response.statusCode).to.equal(302)
      expect(response.headers.location).to.equal('/welcome')
    }
    expect((await send('GET', '/status')).statusCode).to.equal(200)
    await welcome()
  })

  it('rejects missing CSRF and foreign origins without creating an administrator', async function () {
    await welcome()
    expect((await send('POST', '/welcome', credentials)).statusCode).to.equal(
      403
    )
    expect(
      (
        await send('POST', '/welcome', credentials, {
          'x-csrf-token': csrfToken,
          origin: 'https://foreign.example.invalid',
        })
      ).statusCode
    ).to.equal(403)
    expect(await User.countDocuments()).to.equal(0)
    expect(
      (await states.findOne({ _id: 'installation' })).initialized
    ).to.equal(false)
  })

  it('initializes, logs in, rotates CSRF and permanently closes Welcome', async function () {
    await welcome()
    const oldToken = csrfToken
    const response = await send('POST', '/welcome', credentials, {
      'x-csrf-token': csrfToken,
      accept: 'application/json',
    })
    expect(response.statusCode).to.equal(200)
    expect(response.body).to.deep.equal({ redir: '/project' })
    expect(
      await User.countDocuments({
        isAdmin: true,
        role: 'admin',
        status: 'active',
      })
    ).to.equal(1)
    expect(
      (await states.findOne({ _id: 'installation' })).initialized
    ).to.equal(true)
    const projects = await send('GET', '/project')
    expect(projects.statusCode).to.equal(200)
    csrfToken = projects.body.match(
      /<meta[^>]*name="ol-csrfToken"[^>]*content="([^"]+)"/
    )[1]
    expect(csrfToken).not.to.equal(oldToken)
    expect(
      (
        await send('POST', '/welcome', credentials, {
          'x-csrf-token': oldToken,
        })
      ).statusCode
    ).to.equal(403)
    expect(
      (
        await send('POST', '/welcome', credentials, {
          'x-csrf-token': csrfToken,
        })
      ).statusCode
    ).to.equal(409)
    expect((await send('GET', '/welcome')).headers.location).to.equal(
      '/project'
    )
    client = request.defaults({ jar: request.jar() })
    expect((await send('GET', '/welcome')).headers.location).to.equal('/login')
  })
})
