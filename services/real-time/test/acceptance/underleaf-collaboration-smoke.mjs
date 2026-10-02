import io from 'socket.io-client'
import Settings from '@overleaf/settings'
import redis from '@overleaf/redis-wrapper'
import crypto from 'node:crypto'
import { XMLHttpRequest } from './libs/XMLHttpRequest.js'

const webUrl = process.env.UNDERLEAF_WEB_URL || 'http://127.0.0.1:4000'
const realTimeUrl = process.env.UNDERLEAF_REALTIME_URL || 'http://127.0.0.1:3026'
const ownerUsername = process.env.UNDERLEAF_USERNAME
const ownerPassword = process.env.UNDERLEAF_PASSWORD
const targetUsername = process.env.UNDERLEAF_TARGET_USERNAME

if (!ownerUsername || !ownerPassword || !targetUsername) {
  throw new Error(
    'Set UNDERLEAF_USERNAME, UNDERLEAF_PASSWORD and UNDERLEAF_TARGET_USERNAME before running this smoke test.'
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
    body: JSON.stringify({
      username: ownerUsername,
      password: ownerPassword,
      _csrf: loginToken,
    }),
  })
  assertStatus(loginResponse, 302, 'login')
  await loginResponse.text()

  const dashboard = await request(jar, '/project')
  assertStatus(dashboard, 200, 'project dashboard')
  return { jar, csrfToken: csrfTokenFromHtml(await dashboard.text()) }
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
  const signedSessionId = `${sessionId}.${digest}`
  return `${Settings.cookieName}=s:${signedSessionId}`
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

async function connectToProject(projectId, cookie) {
  currentSocketCookie = cookie
  const socket = io.connect(realTimeUrl, {
    'force new connection': true,
    query: new URLSearchParams({ projectId }).toString(),
  })
  const [response] = await waitForSocketEvent(
    socket,
    'joinProjectResponse'
  )
  socket.publicId = response.publicId
  return { socket, project: response.project }
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

function waitForAppliedVersion(socket, docId, minimumVersion) {
  return waitForSocketEvent(
    socket,
    'otUpdateApplied',
    update => update?.doc === docId && update.v >= minimumVersion
  )
}

function textFromLines(lines) {
  return lines.join('\n')
}

async function joinDocument(socket, docId) {
  const [lines, version] = await emitWithAck(socket, 'joinDoc', docId, {
    supportsHistoryOT: true,
    encodeRanges: true,
  })
  return { lines, version }
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

let ownerSocket
let targetSocket
let projectId
let httpSession

try {
  httpSession = await login()

  const ownerSearch = await request(
    httpSession.jar,
    `/underleaf/users/search?username=${encodeURIComponent(ownerUsername)}`
  )
  assertStatus(ownerSearch, 200, 'find owner')
  const ownerId = (await readJson(ownerSearch)).user.id

  const targetSearch = await request(
    httpSession.jar,
    `/underleaf/users/search?username=${encodeURIComponent(targetUsername)}`
  )
  assertStatus(targetSearch, 200, 'find target collaborator')
  const targetId = (await readJson(targetSearch)).user.id

  const created = await request(httpSession.jar, '/project/new', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': httpSession.csrfToken,
    },
    body: JSON.stringify({ projectName: `M15 Collaboration Smoke ${Date.now()}` }),
  })
  assertStatus(created, 200, 'create project')
  projectId = (await readJson(created)).project_id

  const added = await request(
    httpSession.jar,
    `/project/${projectId}/users/by-username`,
    {
      method: 'PUT',
      headers: {
        'content-type': 'application/json',
        'x-csrf-token': httpSession.csrfToken,
      },
      body: JSON.stringify({ username: targetUsername, permission: 'editor' }),
    }
  )
  assertStatus(added, 200, 'add target collaborator')
  await added.text()

  ownerSocket = await connectToProject(
    projectId,
    await createRealtimeSession(ownerId)
  )
  const rootDocId = ownerSocket.project.rootDoc_id
  if (!rootDocId) throw new Error('The joined project did not expose rootDoc_id.')

  targetSocket = await connectToProject(
    projectId,
    await createRealtimeSession(targetId)
  )

  const ownerDocument = await joinDocument(ownerSocket.socket, rootDocId)
  const targetDocument = await joinDocument(targetSocket.socket, rootDocId)
  if (ownerDocument.version !== targetDocument.version) {
    throw new Error('Concurrent clients did not start from the same document version.')
  }

  const cursorUpdate = waitForSocketEvent(
    ownerSocket.socket,
    'clientTracking.clientUpdated',
    update =>
      update?.user_id === targetId &&
      update.doc_id === rootDocId &&
      update.row === 3 &&
      update.column === 4
  )
  await emitWithAck(targetSocket.socket, 'clientTracking.updatePosition', {
    doc_id: rootDocId,
    row: 3,
    column: 4,
  })
  await cursorUpdate

  const baseVersion = ownerDocument.version
  const ownerApplied = waitForAppliedVersion(
    ownerSocket.socket,
    rootDocId,
    baseVersion + 1
  )
  const targetApplied = waitForAppliedVersion(
    targetSocket.socket,
    rootDocId,
    baseVersion + 1
  )
  await Promise.all([
    emitWithAck(ownerSocket.socket, 'applyOtUpdate', rootDocId, {
      op: [{ i: 'M15-A', p: 0 }],
      v: baseVersion,
    }),
    emitWithAck(targetSocket.socket, 'applyOtUpdate', rootDocId, {
      op: [{ i: 'M15-B', p: 0 }],
      v: baseVersion,
    }),
  ])
  await Promise.all([ownerApplied, targetApplied])

  const targetDisconnected = waitForSocketEvent(targetSocket.socket, 'disconnect')
  targetSocket.socket.disconnect()
  await targetDisconnected

  const recoveryApplied = waitForAppliedVersion(
    ownerSocket.socket,
    rootDocId,
    baseVersion + 2
  )
  await emitWithAck(ownerSocket.socket, 'applyOtUpdate', rootDocId, {
    op: [{ i: 'M15-R', p: 0 }],
    v: baseVersion + 2,
  })
  await recoveryApplied

  targetSocket = await connectToProject(
    projectId,
    await createRealtimeSession(targetId)
  )
  const recoveredDocument = await joinDocument(targetSocket.socket, rootDocId)
  const recoveredText = textFromLines(recoveredDocument.lines)
  for (const marker of ['M15-A', 'M15-B', 'M15-R']) {
    if (!recoveredText.includes(marker)) {
      throw new Error(`Recovered document lost the concurrent marker ${marker}.`)
    }
  }
  if (recoveredDocument.version < baseVersion + 3) {
    throw new Error('Recovered document version did not include all updates.')
  }

  console.log('Underleaf real-time collaboration smoke test passed.')
} finally {
  ownerSocket?.socket.disconnect()
  targetSocket?.socket.disconnect()
  if (httpSession) {
    await deleteProject(httpSession.jar, httpSession.csrfToken, projectId)
  }
  if (sessionIds.length > 0) {
    await redisClient.del(...sessionIds.map(sessionId => `sess:${sessionId}`))
  }
  await redisClient.quit()
}
