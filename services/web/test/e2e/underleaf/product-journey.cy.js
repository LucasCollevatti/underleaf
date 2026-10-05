let credentials
let projectPath

function assertPublicIdentity(user) {
  expect(user.username).to.be.a('string').and.not.be.empty
  for (const field of [
    'email',
    'emails',
    'password',
    'passwordHash',
    'hashedPassword',
  ]) {
    expect(user, `public identity must omit ${field}`).not.to.have.property(
      field
    )
  }
}

function assertShell() {
  cy.get('.underleaf-app-shell').should('be.visible')
  cy.get('.underleaf-sidebar')
    .findByRole('img', { name: 'Underleaf' })
    .should('be.visible')
  cy.get('main#main-content').should('be.visible')
  cy.get(
    'input[type=email], a[href*="/subscription"], a[href*="/affiliations"], a[href="/register"], a[href="/forgot-password"]'
  ).should('not.exist')
}

function sidebarTheme(name) {
  return cy.get('.underleaf-sidebar').findByLabelText(name)
}

function selectTheme(name, expectedTheme, authenticated = true) {
  if (authenticated) cy.intercept('POST', '/user/settings').as('saveTheme')
  // The visual labels are the click targets; the native radios are hidden by CSS.
  sidebarTheme(name).then($input => {
    cy.get(`label[for="${$input.attr('id')}"]`).click()
  })
  sidebarTheme(name).should('be.checked')
  cy.get('body').should('have.attr', 'data-theme', expectedTheme)
  if (authenticated)
    cy.wait('@saveTheme').its('response.statusCode').should('eq', 200)
}

function systemAppearance(value) {
  cy.then(() =>
    Cypress.automation('remote:debugger:protocol', {
      command: 'Emulation.setEmulatedMedia',
      params: { features: [{ name: 'prefers-color-scheme', value }] },
    })
  )
}

function logIn(account, password = account.password) {
  cy.visit('/login')
  assertShell()
  cy.findByLabelText('Username').type(account.username)
  cy.findByLabelText('Password', { exact: true }).type(password, { log: false })
  cy.findByRole('button', { name: 'Log in', exact: true }).click()
  cy.location('pathname').should('eq', '/project')
}

function logOut() {
  cy.visit('/logout')
  assertShell()
  cy.findByRole('button', { name: 'Log out', exact: true }).click()
  cy.location('pathname').should('eq', '/login')
}

function createAdministrator() {
  cy.intercept('POST', '/welcome').as('initialize')
  cy.findByRole('button', { name: 'Get started' }).click()
  cy.findByLabelText('Username').type(credentials.admin.username)
  cy.findByLabelText('Display name').type('Product Administrator')
  cy.findByLabelText('Password', { exact: true }).type(
    credentials.admin.password,
    { log: false }
  )
  cy.findByLabelText('Confirm password').type(credentials.admin.password, {
    log: false,
  })
  cy.findByRole('button', { name: 'Create administrator' }).click()
  cy.wait('@initialize').then(({ request, response }) => {
    expect(request.body).not.to.have.property('email')
    expect(response.statusCode).to.equal(200)
    expect(response.body).to.deep.equal({ redir: '/project' })
  })
  cy.location('pathname').should('eq', '/project')
  assertShell()
  cy.contains('No projects yet').should('be.visible')
  cy.request({ url: '/welcome', followRedirect: false }).then(response => {
    expect(response.status).to.equal(302)
    expect(response.headers.location).to.equal('/project')
  })
}

function createProject() {
  cy.intercept('POST', '/project/new').as('newProject')
  cy.findAllByRole('button', { name: 'New project', exact: true })
    .first()
    .click()
  cy.findByRole('menuitem', { name: 'Blank project' }).click()
  cy.findByRole('dialog').within(() => {
    cy.findByLabelText('Project name').type(credentials.projectName)
    cy.findByRole('button', { name: 'Create', exact: true }).click()
  })
  cy.wait('@newProject').then(({ response }) => {
    expect(response.statusCode).to.equal(200)
    assertPublicIdentity(response.body.owner)
    projectPath = `/project/${response.body.project_id}`
  })
  cy.location('pathname').should('match', /^\/project\/[a-f0-9]{24}$/)
  cy.get('.ide-redesign-toolbar').should('be.visible')
  cy.get('a.ide-redesign-toolbar-home-link [aria-label="Underleaf"]').should(
    'exist'
  )
  cy.contains('main.tex').should('be.visible')
  cy.get('.cm-editor .cm-content[contenteditable=true]').should('be.visible')
  cy.get(
    'a[href*="/subscription"], .ide-redesign-toolbar-cobranding-logo'
  ).should('not.exist')
}

function createUser() {
  cy.visit('/admin')
  assertShell()
  cy.findByRole('heading', { name: 'Overview' }).should('be.visible')
  cy.visit('/admin/users')
  assertShell()
  cy.get('meta[name="ol-underleafAdminPage"]').then($meta => {
    const data = JSON.parse($meta.attr('content'))
    data.users.forEach(assertPublicIdentity)
  })
  cy.intercept('POST', '/admin/users').as('createUser')
  cy.findByRole('button', { name: 'Create user', exact: true }).click()
  cy.findByRole('dialog').within(() => {
    cy.findByLabelText('Username').type(credentials.user.username)
    cy.findByLabelText('Display name').type('Product Collaborator')
    cy.findByLabelText('Password', { exact: true }).type(
      credentials.user.password,
      { log: false }
    )
    cy.findByLabelText('Confirm password').type(credentials.user.password, {
      log: false,
    })
    cy.findByRole('button', { name: 'Create user', exact: true }).click()
  })
  cy.wait('@createUser').then(({ request, response }) => {
    expect(request.body).not.to.have.property('email')
    expect(response.statusCode).to.equal(200)
    assertPublicIdentity(response.body.user)
    expect(response.body.user).to.include({
      username: credentials.user.username,
      role: 'user',
      status: 'active',
    })
  })
  cy.findByRole('dialog').should('not.exist')
  cy.get('tbody').contains(credentials.user.username).should('be.visible')
  cy.get('tbody input, tbody select').should('not.exist')
}

function shareProject() {
  cy.then(() => cy.visit(projectPath))
  cy.get('.ide-redesign-toolbar')
    .findByRole('button', { name: 'Share', exact: true })
    .click()
  cy.intercept('GET', '/underleaf/users/search*').as('searchUsers')
  cy.intercept('PUT', '/project/*/users/by-username').as('shareByUsername')
  cy.findByRole('dialog').within(() => {
    cy.findByLabelText('Username').type(credentials.user.username)
    cy.wait('@searchUsers').then(({ response }) => {
      expect(response.statusCode).to.equal(200)
      response.body.users.forEach(assertPublicIdentity)
      expect(response.body.users.map(user => user.username)).to.include(
        credentials.user.username
      )
    })
    cy.findByLabelText('Permission', { exact: true }).select('editor')
    cy.findByRole('button', { name: 'Add collaborator' }).click()
    cy.wait('@shareByUsername').then(({ request, response }) => {
      expect(request.body).to.deep.equal({
        username: credentials.user.username,
        permission: 'editor',
      })
      expect(response.statusCode).to.equal(200)
    })
    cy.findByLabelText(`Permission for ${credentials.user.username}`).should(
      'have.value',
      'readAndWrite'
    )
    cy.findByRole('button', { name: 'Close', exact: true }).click()
  })
}

function verifyAccountAppearance() {
  cy.visit('/user/settings')
  assertShell()
  cy.findByLabelText('Username')
    .should('have.value', credentials.admin.username)
    .and('have.attr', 'readonly')
  selectTheme('Dark', 'default')
  cy.reload()
  sidebarTheme('Dark').should('be.checked')
  cy.get('body').should('have.attr', 'data-theme', 'default')
  cy.get('.underleaf-sidebar img').should(
    'have.attr',
    'src',
    '/underleaf-lockup-dark.svg'
  )
  cy.visit('/admin')
  sidebarTheme('Dark').should('be.checked')
  selectTheme('Light', 'light')
  cy.visit('/project')
  sidebarTheme('Light').should('be.checked')
  cy.get('body').should('have.attr', 'data-theme', 'light')
  systemAppearance('light')
  selectTheme('System', 'light')
  systemAppearance('dark')
  cy.get('body').should('have.attr', 'data-theme', 'default')
  cy.reload()
  sidebarTheme('System').should('be.checked')
  cy.get('body').should('have.attr', 'data-theme', 'default')
  systemAppearance('light')
  cy.get('body').should('have.attr', 'data-theme', 'light')
}

function verifySystemSurfaces() {
  cy.visit('/status')
  assertShell()
  cy.findByRole('heading', { name: 'Installation status' }).should('be.visible')
  cy.get('meta[name="ol-underleafSystem"]').then($meta => {
    const data = JSON.parse($meta.attr('content'))
    expect(data.status).to.include({
      siteOpen: true,
      editorOpen: true,
      shuttingDown: false,
    })
    expect(data.status.uptimeSeconds).to.be.at.least(0)
  })
  for (const accept of ['text/plain', 'application/json', '*/*']) {
    cy.request({ url: '/status', headers: { accept } }).then(response => {
      expect(response.status).to.equal(200)
      expect(response.body).to.equal('web is alive (web)')
    })
  }
  cy.visit('/underleaf-product-missing-page', { failOnStatusCode: false })
  assertShell()
  cy.findByRole('heading', { name: 'Page not found' }).should('be.visible')
  cy.get('body').should('not.contain.text', 'passwordHash')
  cy.visit('/logout')
  cy.findByRole('link', { name: 'Cancel', exact: true }).click()
  cy.location('pathname').should('eq', '/project')
}

function verifyMemberAccess() {
  logOut()
  logIn(credentials.user)
  cy.get(
    '.underleaf-sidebar a[href="/admin"], .underleaf-sidebar a[href="/admin/users"]'
  ).should('not.exist')
  cy.findByRole('link', { name: credentials.projectName, exact: true }).should(
    'be.visible'
  )
  cy.request({
    url: '/admin/users',
    headers: { accept: 'text/html' },
    followRedirect: false,
    failOnStatusCode: false,
  })
    .its('status')
    .should('eq', 403)
  cy.request({
    url: '/status',
    headers: { accept: 'text/html' },
    followRedirect: false,
    failOnStatusCode: false,
  })
    .its('status')
    .should('eq', 403)
  cy.then(() => cy.visit(projectPath))
  cy.get('.ide-redesign-toolbar').should('be.visible')
  cy.get('meta[name="ol-user"]').then($meta =>
    assertPublicIdentity(JSON.parse($meta.attr('content')))
  )
  cy.get('.cm-editor .cm-content[contenteditable=true]').should('be.visible')
  logOut()
  logIn(credentials.admin)
  cy.visit('/user/settings')
  sidebarTheme('System').should('be.checked')
}

function verifyPasswordRecovery() {
  cy.visit('/admin/users')
  cy.intercept('POST', '/admin/users/*/password').as('resetPassword')
  cy.findByRole('button', {
    name: `Reset password: ${credentials.user.username}`,
    exact: true,
  }).click()
  cy.findByRole('dialog').within(() => {
    cy.findByLabelText('Password', { exact: true }).type(
      credentials.resetPassword,
      { log: false }
    )
    cy.findByLabelText('Confirm password').type(credentials.resetPassword, {
      log: false,
    })
    cy.findByRole('button', { name: 'Reset password', exact: true }).click()
  })
  cy.wait('@resetPassword').its('response.statusCode').should('eq', 200)
  logOut()
  cy.visit('/login')
  cy.findByLabelText('Username').type(credentials.user.username)
  cy.findByLabelText('Password', { exact: true }).type(
    credentials.user.password,
    { log: false }
  )
  cy.findByRole('button', { name: 'Log in', exact: true }).click()
  cy.findByRole('alert').should('be.visible')
  cy.location('pathname').should('eq', '/login')
  logIn(credentials.user, credentials.resetPassword)
  cy.visit('/welcome')
  cy.location('pathname').should('eq', '/project')
}

describe('Underleaf product invariants on a fresh installation', () => {
  before(() => {
    // Read-only preflight. Never reset an existing installation or its database.
    cy.request({
      url: '/welcome',
      followRedirect: false,
      headers: { accept: 'text/html' },
    }).then(response => {
      expect(response.status, 'suite requires a fresh installation').to.equal(
        200
      )
      expect(response.body).to.include(
        'name="ol-underleafAuthPage" content="welcome"'
      )
    })
    cy.task('productCredentials', null, { log: false }).then(value => {
      credentials = value
    })
  })

  it('completes setup, projects, identity, administration, sharing, appearance and authentication', () => {
    cy.visit('/')
    cy.location('pathname').should('eq', '/welcome')
    assertShell()
    selectTheme('Dark', 'default', false)
    cy.reload()
    sidebarTheme('Dark').should('be.checked')
    selectTheme('Light', 'light', false)
    createAdministrator()
    createProject()
    createUser()
    shareProject()
    verifyAccountAppearance()
    verifySystemSurfaces()
    cy.viewport(390, 844)
    cy.get('.underleaf-sidebar')
      .findByRole('button', { name: 'Menu' })
      .click()
      .should('have.attr', 'aria-expanded', 'true')
    cy.get('.underleaf-sidebar .theme-toggle').should('be.visible')
    sidebarTheme('System').should('be.checked')
    cy.viewport(1280, 900)
    verifyMemberAccess()
    verifyPasswordRecovery()
  })
})
