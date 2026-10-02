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
  return body ? JSON.parse(body) : null
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
  const loginToken = csrfTokenFromHtml(await loginPage.text())

  const login = await request('/login', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username, password, _csrf: loginToken }),
  })
  assertStatus(login, 302, 'login')
  await login.text()

  const dashboard = await request('/project')
  assertStatus(dashboard, 200, 'project dashboard')
  csrfToken = csrfTokenFromHtml(await dashboard.text())

  const created = await postJson(
    '/project/new',
    { projectName: `M10 Editor Smoke ${Date.now()}` },
    csrfToken
  )
  assertStatus(created, 200, 'create project')
  const project = await readJson(created)
  createdProjectIds.push(project.project_id)

  const editorPage = await request(`/project/${project.project_id}`)
  assertStatus(editorPage, 200, 'open editor')
  const editorHtml = await editorPage.text()
  for (const marker of [
    'id="ide-root"',
    `name="ol-project_id" content="${project.project_id}"`,
    'name="ol-defaultLatexCompiler"',
    'name="ol-wsUrl"',
    'name="ol-isSaas" data-type="boolean"',
  ]) {
    if (!editorHtml.includes(marker)) {
      throw new Error(`Editor page is missing marker: ${marker}`)
    }
  }

  const entitiesResponse = await request(
    `/project/${project.project_id}/entities`
  )
  assertStatus(entitiesResponse, 200, 'load editor entities')
  const entities = await readJson(entitiesResponse)
  if (!entities.entities.some(entity => entity.path === '/main.tex')) {
    throw new Error('Editor entity tree did not contain the root .tex document.')
  }

  const compileResponse = await postJson(
    `/project/${project.project_id}/compile`,
    {},
    csrfToken
  )
  assertStatus(compileResponse, 200, 'compile project')
  const compile = await readJson(compileResponse)
  if (compile.status !== 'success') {
    throw new Error(`Compilation failed with status ${compile.status}.`)
  }

  for (const outputPath of ['output.pdf', 'output.log', 'output.synctex.gz']) {
    const output = compile.outputFiles.find(file => file.path === outputPath)
    if (!output) throw new Error(`Compilation did not produce ${outputPath}.`)

    const outputResponse = await request(output.url)
    assertStatus(outputResponse, 200, `download ${outputPath}`)
    const outputBytes = new Uint8Array(await outputResponse.arrayBuffer())
    if (outputBytes.length === 0) {
      throw new Error(`Compilation output ${outputPath} was empty.`)
    }
    if (
      outputPath === 'output.pdf' &&
      new TextDecoder().decode(outputBytes.slice(0, 5)) !== '%PDF-'
    ) {
      throw new Error('PDF preview output did not contain a PDF document.')
    }
  }

  console.log('Underleaf editor smoke test passed.')
} finally {
  if (csrfToken) {
    for (const projectId of createdProjectIds.reverse()) {
      await deleteProject(projectId, csrfToken)
    }
  }
}
