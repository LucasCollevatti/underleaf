const baseUrl = process.env.UNDERLEAF_BASE_URL || 'http://localhost:8080'
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

function csrfTokenFromHtml(html) {
  const token =
    html.match(/name="_csrf"[^>]*value="([^"]+)"/)?.[1] ||
    html.match(/name="ol-csrfToken"[^>]*content="([^"]+)"/)?.[1]
  if (!token) throw new Error('Could not find a CSRF token in the page.')
  return token
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

const cookies = new CookieJar()
let csrfToken
let projectId

async function request(path, options = {}) {
  const headers = new Headers(options.headers)
  const cookieHeader = cookies.header()
  if (cookieHeader) headers.set('cookie', cookieHeader)
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
    redirect: 'manual',
  })
  cookies.update(response)
  return response
}

async function requestJson(path, method, body) {
  return await request(path, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(body),
  })
}

async function deleteProject() {
  if (!projectId || !csrfToken) return
  const response = await request(`/Project/${projectId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': csrfToken },
  })
  assertStatus(response, 200, `delete project ${projectId}`)
  await response.text()
}

function targetEmail() {
  return `${targetUsername.toLowerCase()}@underleaf.local`
}

try {
  const unauthenticatedSearch = await fetch(
    `${baseUrl}/underleaf/users/search?username=${encodeURIComponent(targetUsername)}`,
    { redirect: 'manual' }
  )
  assertStatus(unauthenticatedSearch, 302, 'unauthenticated username search')

  const loginPage = await request('/login')
  assertStatus(loginPage, 200, 'login page')
  const loginToken = csrfTokenFromHtml(await loginPage.text())
  const login = await request('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      username: ownerUsername,
      password: ownerPassword,
      _csrf: loginToken,
    }),
  })
  assertStatus(login, 302, 'login')
  await login.text()

  const dashboard = await request('/project')
  assertStatus(dashboard, 200, 'project dashboard')
  csrfToken = csrfTokenFromHtml(await dashboard.text())

  const search = await request(
    `/underleaf/users/search?username=${encodeURIComponent(targetUsername)}`
  )
  assertStatus(search, 200, 'search user by username')
  const searchResult = await readJson(search)
  if (searchResult.user.username !== targetUsername.toLowerCase()) {
    throw new Error('Username search returned the wrong user.')
  }

  const missingSearch = await request('/underleaf/users/search?username=missing-user')
  assertStatus(missingSearch, 404, 'search missing username')
  if ((await readJson(missingSearch)).error !== 'user_not_found') {
    throw new Error('Missing username did not return user_not_found.')
  }

  const created = await requestJson('/project/new', 'POST', {
    projectName: `M14 Sharing Smoke ${Date.now()}`,
  })
  assertStatus(created, 200, 'create project')
  projectId = (await readJson(created)).project_id

  const addedEditor = await requestJson(
    `/project/${projectId}/users/by-username`,
    'PUT',
    { username: targetUsername, permission: 'editor' }
  )
  assertStatus(addedEditor, 200, 'add editor by username')

  const editorMembers = await request(`/project/${projectId}/members`)
  assertStatus(editorMembers, 200, 'list editor members')
  const editorMember = (await readJson(editorMembers)).members.find(
    member => member.email === targetEmail()
  )
  if (!editorMember || editorMember.privileges !== 'readAndWrite') {
    throw new Error('Username collaborator was not granted editor access.')
  }

  const updatedViewer = await requestJson(
    `/project/${projectId}/users/by-username`,
    'PUT',
    { username: targetUsername, permission: 'viewer' }
  )
  assertStatus(updatedViewer, 200, 'change collaborator to viewer')

  const viewerMembers = await request(`/project/${projectId}/members`)
  assertStatus(viewerMembers, 200, 'list viewer members')
  const viewerMember = (await readJson(viewerMembers)).members.find(
    member => member.email === targetEmail()
  )
  if (!viewerMember || viewerMember.privileges !== 'readOnly') {
    throw new Error('Username collaborator was not changed to viewer access.')
  }

  const removed = await request(
    `/project/${projectId}/users/by-username/${encodeURIComponent(targetUsername)}`,
    { method: 'DELETE', headers: { 'x-csrf-token': csrfToken } }
  )
  assertStatus(removed, 204, 'remove collaborator by username')
  await removed.text()

  const remainingMembers = await request(`/project/${projectId}/members`)
  assertStatus(remainingMembers, 200, 'list members after removal')
  if (
    (await readJson(remainingMembers)).members.some(
      member => member.email === targetEmail()
    )
  ) {
    throw new Error('Removed username collaborator still has project access.')
  }

  const missingAdd = await requestJson(
    `/project/${projectId}/users/by-username`,
    'PUT',
    { username: 'missing-user', permission: 'viewer' }
  )
  assertStatus(missingAdd, 404, 'add missing username')
  if ((await readJson(missingAdd)).error !== 'user_not_found') {
    throw new Error('Missing collaborator did not return user_not_found.')
  }

  console.log('Underleaf username sharing smoke test passed.')
} finally {
  await deleteProject()
}
