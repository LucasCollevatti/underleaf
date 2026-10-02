import io from 'socket.io-client'
import Settings from '@overleaf/settings'
import redis from '@overleaf/redis-wrapper'
import crypto from 'node:crypto'
import { XMLHttpRequest } from './libs/XMLHttpRequest.js'

const webUrl = process.env.UNDERLEAF_WEB_URL || 'http://127.0.0.1:4000'
const realTimeUrl = process.env.UNDERLEAF_REALTIME_URL || 'http://127.0.0.1:3026'
const username = process.env.UNDERLEAF_USERNAME
const password = process.env.UNDERLEAF_PASSWORD

if (!username || !password) {
  throw new Error(
    'Set UNDERLEAF_USERNAME and UNDERLEAF_PASSWORD before running this smoke test.'
  )
}

class CookieJar {
  #cookies = new Map()

  update(response) {
    for (const setCookie of response.headers.getSetCookie?.() || []) {
      const [cookie] = setCookie.split(';', 1)
      const [name, value] = cookie.split('=', 2)
      this.#cookies.set(name, value)
    }
  }

  header() {
    return [...this.#cookies]
      .map(([name, value]) => `${name}=${value}`)
      .join('; ')
  }
}

const redisClient = redis.createClient(Settings.redis.websessions)
const sessionIds = []
let currentSocketCookie = null

io.util.request = function () {
  const xhr = new XMLHttpRequest()
  const open = xhr.open
  xhr.open = function () {
    open.apply(xhr, arguments)
    if (currentSocketCookie) {
      xhr.setRequestHeader('Cookie', currentSocketCookie)
    }
  }
  return xhr
}

function assertStatus(response, expected, operation) {
  if (response.status !== expected) {
    throw new Error(`${operation}: expected ${expected}, got ${response.status}`)
  }
}

async function readJson(response) {
  const body = await response.text()
  return body ? JSON.parse(body) : null
}

function csrfTokenFromHtml(html) {
  const token =
    html.match(/name="_csrf"[^>]*value="([^"]+)"/)?.[1] ||
    html.match(/name="ol-csrfToken"[^>]*content="([^"]+)"/)?.[1]
  if (!token) throw new Error('Could not find a CSRF token in the page.')
  return token
}

async function request(jar, path, options = {}) {
  const headers = new Headers(options.headers)
  const cookieHeader = jar.header()
  if (cookieHeader) headers.set('cookie', cookieHeader)
  const response = await fetch(`${webUrl}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  })
  jar.update(response)
  return response
}

async function login() {
  const jar = new CookieJar()
  const loginPage = await request(jar, '/login')
  assertStatus(loginPage, 200, 'login page')
  const loginToken = csrfTokenFromHtml(await loginPage.text())
  const loginResponse = await request(jar, '/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password, _csrf: loginToken }),
  })
  assertStatus(loginResponse, 302, 'login')
  await loginResponse.text()

  const dashboard = await request(jar, '/project')
  assertStatus(dashboard, 200, 'project dashboard')
  return { jar, csrfToken: csrfTokenFromHtml(await dashboard.text()) }
}

async function findUser(jar) {
  const response = await request(
    jar,
    `/underleaf/users/search?username=${encodeURIComponent(username)}`
  )
  assertStatus(response, 200, 'find owner')
  return (await readJson(response)).user
}

async function createRealtimeSession(userId) {
  const sessionId = crypto
    .randomBytes(18)
    .toString('base64')
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  await redisClient.set(
    `sess:${sessionId}`,
    JSON.stringify({ user: { _id: userId }, cookie: {} })
  )
  sessionIds.push(sessionId)
  const digest = crypto
    .createHmac('sha256', Settings.security.sessionSecret)
    .update(sessionId)
    .digest('base64')
    .replaceAll('=', '')
  return `${Settings.cookieName}=s:${sessionId}.${digest}`
}

function waitForSocketEvent(socket, eventName, predicate = () => true) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      socket.removeListener(eventName, onEvent)
      reject(new Error(`Timed out waiting for ${eventName}.`))
    }, 15000)

    function onEvent(...args) {
      if (!predicate(...args)) return
      clearTimeout(timeout)
      socket.removeListener(eventName, onEvent)
      resolve(args)
    }

    socket.on(eventName, onEvent)
  })
}

async function emitWithAck(socket, eventName, ...args) {
  return await new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error(`Timed out waiting for ${eventName} acknowledgement.`)),
      15000
    )
    socket.emit(eventName, ...args, (error, ...response) => {
      clearTimeout(timeout)
      if (error) {
        reject(new Error(`${eventName} failed: ${error.message || error}`))
      } else {
        resolve(response)
      }
    })
  })
}

async function connectToProject(projectId, cookie) {
  currentSocketCookie = cookie
  const socket = io.connect(realTimeUrl, {
    'force new connection': true,
    query: new URLSearchParams({ projectId }).toString(),
  })
  const [response] = await waitForSocketEvent(socket, 'joinProjectResponse')
  return { socket, project: response.project }
}

async function joinDocument(socket, docId) {
  return await emitWithAck(socket, 'joinDoc', docId, {
    supportsHistoryOT: true,
    encodeRanges: true,
  })
}

function waitForAppliedVersion(socket, docId, minimumVersion) {
  return waitForSocketEvent(
    socket,
    'otUpdateApplied',
    update => update?.doc === docId && update.v >= minimumVersion
  )
}

async function deleteProject(jar, csrfToken, projectId) {
  if (!projectId) return
  const response = await request(jar, `/Project/${projectId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': csrfToken },
  })
  assertStatus(response, 200, `delete project ${projectId}`)
  await response.text()
}

async function getHistory(jar, projectId) {
  const response = await request(jar, `/project/${projectId}/latest/history`)
  assertStatus(response, 200, 'read latest history')
  return await readJson(response)
}

async function flushHistory(jar, csrfToken, projectId) {
  const response = await request(jar, `/project/${projectId}/flush`, {
    method: 'POST',
    headers: { 'x-csrf-token': csrfToken },
  })
  assertStatus(response, 200, 'flush project history')
  await response.text()
}

async function getUpdates(jar, projectId) {
  const response = await request(
    jar,
    `/project/${projectId}/updates?min_count=1`
  )
  assertStatus(response, 200, 'read project updates')
  return await readJson(response)
}

function assertAttributedUpdate(updates, ownerEmail) {
  const update = updates.updates?.find(item => item.meta?.users?.length > 0)
  if (!update) throw new Error('History did not expose an attributed update.')
  if (!Number.isFinite(update.meta.start_ts) || !Number.isFinite(update.meta.end_ts)) {
    throw new Error('History update did not expose a timestamp range.')
  }
  if (!update.meta.users.some(user => user?.email === ownerEmail)) {
    throw new Error('History update did not expose the responsible user.')
  }
}

let httpSession
let ownerSocket
let projectId

try {
  httpSession = await login()
  const owner = await findUser(httpSession.jar)

  const created = await request(httpSession.jar, '/project/new', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': httpSession.csrfToken,
    },
    body: JSON.stringify({ projectName: `M16 History Smoke ${Date.now()}` }),
  })
  assertStatus(created, 200, 'create project')
  projectId = (await readJson(created)).project_id

  ownerSocket = await connectToProject(
    projectId,
    await createRealtimeSession(owner.id)
  )
  const rootDocId = ownerSocket.project.rootDoc_id
  if (!rootDocId) throw new Error('The joined project did not expose rootDoc_id.')

  const [, baseVersion] = await joinDocument(ownerSocket.socket, rootDocId)
  const marker = `M16-${Date.now()}`
  const applied = waitForAppliedVersion(
    ownerSocket.socket,
    rootDocId,
    baseVersion + 1
  )
  await emitWithAck(ownerSocket.socket, 'applyOtUpdate', rootDocId, {
    op: [{ i: marker, p: 0 }],
    v: baseVersion,
  })
  await applied

  await flushHistory(
    httpSession.jar,
    httpSession.csrfToken,
    projectId
  )

  const historyBeforeRestore = await getHistory(httpSession.jar, projectId)
  const changesBeforeRestore = historyBeforeRestore.chunk?.history?.changes || []
  if (changesBeforeRestore.length < 2) {
    throw new Error('History did not retain the initial state and the edit.')
  }
  assertAttributedUpdate(await getUpdates(httpSession.jar, projectId), owner.email)

  ownerSocket.socket.disconnect()
  ownerSocket = null

  const restore = await request(httpSession.jar, `/project/${projectId}/revert-project`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': httpSession.csrfToken,
    },
    body: JSON.stringify({ version: 0 }),
  })
  assertStatus(restore, 200, 'restore project history version')
  await restore.text()
  await flushHistory(
    httpSession.jar,
    httpSession.csrfToken,
    projectId
  )

  ownerSocket = await connectToProject(
    projectId,
    await createRealtimeSession(owner.id)
  )
  const restoredDocument = await joinDocument(
    ownerSocket.socket,
    ownerSocket.project.rootDoc_id
  )
  if (restoredDocument[0].join('\n').includes(marker)) {
    throw new Error('Restoring version 0 did not remove the later edit.')
  }

  const restoredHistory = await getHistory(httpSession.jar, projectId)
  const changesAfterRestore = restoredHistory.chunk?.history?.changes || []
  if (changesAfterRestore.length <= changesBeforeRestore.length) {
    throw new Error('Restoring a version did not create a new history revision.')
  }

  console.log('Underleaf history and restore smoke test passed.')
} finally {
  ownerSocket?.socket.disconnect()
  if (httpSession) {
    await deleteProject(httpSession.jar, httpSession.csrfToken, projectId)
  }
  if (sessionIds.length > 0) {
    await redisClient.del(...sessionIds.map(sessionId => `sess:${sessionId}`))
  }
  await redisClient.quit()
}
