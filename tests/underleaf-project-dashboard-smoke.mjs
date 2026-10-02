const baseUrl = process.env.UNDERLEAF_BASE_URL || 'http://localhost:8080'
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
    const setCookies = response.headers.getSetCookie?.() || []
    for (const setCookie of setCookies) {
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

const cookies = new CookieJar()

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

async function readJson(response) {
  const body = await response.text()
  if (!body) return null
  return JSON.parse(body)
}

function assertStatus(response, expected, operation) {
  if (response.status !== expected) {
    throw new Error(`${operation}: expected ${expected}, got ${response.status}`)
  }
}

function csrfTokenFromHtml(html) {
  const token =
    html.match(/name="_csrf"[^>]*value="([^"]+)"/)?.[1] ||
    html.match(/name="ol-csrfToken"[^>]*content="([^"]+)"/)?.[1]
  if (!token) throw new Error('Could not find a CSRF token in the page.')
  return token
}

async function postJson(path, body, csrfToken) {
  return await request(path, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-csrf-token': csrfToken,
    },
    body: JSON.stringify(body),
  })
}

async function deleteProject(projectId, csrfToken) {
  const response = await request(`/Project/${projectId}`, {
    method: 'DELETE',
    headers: { 'x-csrf-token': csrfToken },
  })
  assertStatus(response, 200, `delete project ${projectId}`)
  await response.text()
}

const createdProjectIds = []
let csrfToken

try {
  const loginPage = await request('/login')
  assertStatus(loginPage, 200, 'login page')
  const loginPageHtml = await loginPage.text()
  const loginToken = csrfTokenFromHtml(loginPageHtml)

  const login = await request('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password, _csrf: loginToken }),
  })
  assertStatus(login, 302, 'login')
  if (login.headers.get('location') !== '/project') {
    throw new Error('Login did not redirect to the project dashboard.')
  }
  await login.text()

  const dashboard = await request('/project')
  assertStatus(dashboard, 200, 'project dashboard')
  const dashboardHtml = await dashboard.text()
  if (!dashboardHtml.includes('id="project-list-root"')) {
    throw new Error('Project dashboard root was not rendered.')
  }
  if (dashboardHtml.includes('/user/subscription')) {
    throw new Error('SaaS subscription links leaked into the Underleaf dashboard.')
  }
  csrfToken = csrfTokenFromHtml(dashboardHtml)

  const created = await postJson(
    '/project/new',
    { projectName: `M9 Dashboard Smoke ${Date.now()}` },
    csrfToken
  )
  assertStatus(created, 200, 'create project')
  const createdProject = await readJson(created)
  createdProjectIds.push(createdProject.project_id)

  const projectsResponse = await postJson(
    '/api/project',
    { sort: { by: 'lastUpdated', order: 'desc' } },
    csrfToken
  )
  assertStatus(projectsResponse, 200, 'list projects')
  const projects = await readJson(projectsResponse)
  if (!projects.projects.some(project => project.id === createdProject.project_id)) {
    throw new Error('Created project was not returned by the dashboard API.')
  }

  const projectPage = await request(`/project/${createdProject.project_id}`)
  assertStatus(projectPage, 200, 'open project')
  await projectPage.text()

  const renamed = await postJson(
    `/project/${createdProject.project_id}/rename`,
    { newProjectName: 'M9 Dashboard Renamed' },
    csrfToken
  )
  assertStatus(renamed, 200, 'rename project')
  await renamed.text()

  const archived = await postJson(
    `/Project/${createdProject.project_id}/archive`,
    {},
    csrfToken
  )
  assertStatus(archived, 200, 'archive project')
  await archived.text()

  const archivedDashboard = await request('/project/archived')
  assertStatus(archivedDashboard, 200, 'archived project filter')
  await archivedDashboard.text()

  const cloned = await postJson(
    `/Project/${createdProject.project_id}/clone`,
    { projectName: 'M9 Dashboard Copy' },
    csrfToken
  )
  assertStatus(cloned, 200, 'duplicate project')
  const clonedProject = await readJson(cloned)
  createdProjectIds.push(clonedProject.project_id)

  const zip = await request(
    `/Project/${createdProject.project_id}/download/zip`
  )
  assertStatus(zip, 200, 'export project zip')
  const zipBytes = new Uint8Array(await zip.arrayBuffer())
  if (zipBytes[0] !== 0x50 || zipBytes[1] !== 0x4b) {
    throw new Error('Project ZIP export did not return a ZIP archive.')
  }

  console.log('Underleaf project dashboard smoke test passed.')
} finally {
  for (const projectId of createdProjectIds.reverse()) {
    await deleteProject(projectId, csrfToken)
  }
}
