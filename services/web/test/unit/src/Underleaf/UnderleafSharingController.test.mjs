import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  find: vi.fn(),
  findOne: vi.fn(),
  toArray: vi.fn(),
  access: vi.fn(),
  add: vi.fn(),
  change: vi.fn(),
  remove: vi.fn(),
  emit: vi.fn(),
  audit: vi.fn(),
}))
vi.mock('../../../../app/src/infrastructure/mongodb.mjs', () => ({
  db: { users: { find: mocks.find, findOne: mocks.findOne } },
}))
vi.mock(
  '../../../../app/src/Features/Collaborators/CollaboratorsGetter.mjs',
  () => ({ default: { promises: { getProjectAccess: mocks.access } } })
)
vi.mock(
  '../../../../app/src/Features/Collaborators/CollaboratorsHandler.mjs',
  () => ({
    default: {
      promises: {
        addUserIdToProject: mocks.add,
        setCollaboratorPrivilegeLevel: mocks.change,
      },
    },
  })
)
vi.mock(
  '../../../../app/src/Features/Collaborators/CollaboratorsController.mjs',
  () => ({ default: { removeUserFromProject: mocks.remove } })
)
vi.mock(
  '../../../../app/src/Features/Editor/EditorRealTimeController.mjs',
  () => ({ default: { emitToRoom: mocks.emit } })
)
vi.mock(
  '../../../../app/src/Features/Project/ProjectAuditLogHandler.mjs',
  () => ({ default: { addEntryInBackground: mocks.audit } })
)
vi.mock(
  '../../../../app/src/Features/Underleaf/UnderleafUserManager.mjs',
  () => ({ normalizeUsername: value => value.trim().toLowerCase() })
)
import Controller from '../../../../app/src/Features/Underleaf/UnderleafSharingController.mjs'

const projectId = '000000000000000000000001'
const userId = '000000000000000000000002'
let req, cursor, privilege

async function expectRejected(promise, assertion) {
  let error
  try {
    await promise
  } catch (candidate) {
    error = candidate
  }
  expect(error).toBeInstanceOf(Error)
  assertion(error)
}

beforeEach(() => {
  vi.clearAllMocks()
  privilege = false
  req = {
    params: { Project_id: projectId },
    query: {},
    ip: '127.0.0.1',
    body: { username: ' Luc.as ', permission: 'editor' },
    session: {
      passport: {
        user: {
          _id: 'owner-id',
          username: 'owner',
          status: 'active',
          identityVersion: 1,
        },
      },
    },
  }
  cursor = {
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    toArray: mocks.toArray,
  }
  mocks.find.mockReturnValue(cursor)
  mocks.toArray.mockResolvedValue([
    { _id: userId, username: 'luc.as', displayName: 'Lucas' },
  ])
  mocks.findOne.mockResolvedValue({
    _id: userId,
    username: 'luc.as',
    displayName: 'Lucas',
  })
  mocks.access.mockResolvedValue({ privilegeLevelForUser: () => privilege })
  mocks.add.mockResolvedValue(undefined)
  mocks.change.mockResolvedValue(undefined)
  mocks.remove.mockImplementation((req, res) => res.sendStatus(204))
})
function invoke(handler) {
  return new Promise((resolve, reject) => {
    const res = {
      statusCode: 200,
      headers: {},
      status(code) {
        this.statusCode = code
        return this
      },
      set(key, value) {
        this.headers[key] = value
        return this
      },
      json(body) {
        resolve({ status: this.statusCode, body, headers: this.headers })
      },
      sendStatus(code) {
        resolve({ status: code })
      },
    }
    Promise.resolve(handler(req, res, reject)).catch(reject)
  })
}
describe('Underleaf direct sharing by username', () => {
  it('searches an escaped username prefix among active accounts with bounded results', async () => {
    req.query = { username: ' Luc. ' }
    const result = await invoke(Controller.searchUsers)
    expect(mocks.find).toHaveBeenCalledWith(
      { username: { $regex: '^luc\\.' }, status: 'active' },
      { projection: { _id: 1, username: 1, displayName: 1 } }
    )
    expect(cursor.sort).toHaveBeenCalledWith({ username: 1 })
    expect(cursor.limit).toHaveBeenCalledWith(20)
    expect(result.headers['Cache-Control']).toBe('no-store')
    expect(result.body.users).toEqual([
      { id: userId.toString(), username: 'luc.as', displayName: 'Lucas' },
    ])
  })
  it('returns no matches without inventing a holding account or email invite', async () => {
    req.query = { username: 'missing' }
    mocks.toArray.mockResolvedValue([])
    expect((await invoke(Controller.searchUsers)).body).toEqual({ users: [] })
    mocks.findOne.mockResolvedValue(null)
    expect((await invoke(Controller.addUserByUsername)).status).toBe(404)
    expect(mocks.add).not.toHaveBeenCalled()
  })
  it.each(['a', '.*', 'lucas@example.com', 'x'.repeat(33)])(
    'rejects invalid search %s',
    async username => {
      req.query = { username }
      await expectRejected(invoke(Controller.searchUsers), () => {})
      expect(mocks.find).not.toHaveBeenCalled()
    }
  )
  it.each(['editor', 'viewer'])(
    'grants %s access directly and emits membership updates',
    async permission => {
      req.body.permission = permission
      const result = await invoke(Controller.addUserByUsername)
      const level = permission === 'editor' ? 'readAndWrite' : 'readOnly'
      expect(mocks.findOne).toHaveBeenCalledWith(
        { username: 'luc.as', status: 'active' },
        expect.any(Object)
      )
      expect(mocks.add).toHaveBeenCalledWith(
        projectId,
        'owner-id',
        userId,
        level
      )
      expect(mocks.audit).toHaveBeenCalledWith(
        projectId,
        'add-collaborator',
        'owner-id',
        req.ip,
        { userId, collaboratorUsername: 'luc.as', role: permission }
      )
      expect(result.body.member).toMatchObject({
        username: 'luc.as',
        privileges: level,
      })
      expect(result.body.member).not.toHaveProperty('email')
      expect(mocks.emit).toHaveBeenCalledWith(
        projectId,
        'project:membership:changed',
        { members: true }
      )
    }
  )
  it('updates an existing collaborator with audit context instead of adding twice', async () => {
    privilege = 'readOnly'
    await invoke(Controller.addUserByUsername)
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.change).toHaveBeenCalledWith(
      projectId,
      userId,
      'readAndWrite',
      {},
      { ipAddress: req.ip, initiatorId: 'owner-id' }
    )
  })
  it('keeps repeated grants idempotent', async () => {
    privilege = 'readAndWrite'
    await invoke(Controller.addUserByUsername)
    expect(mocks.change).not.toHaveBeenCalled()
    expect(mocks.add).not.toHaveBeenCalled()
  })
  it.each(['owner', 'admin', 'review'])(
    'rejects unsupported permission %s',
    async permission => {
      req.body.permission = permission
      await expectRejected(invoke(Controller.addUserByUsername), () => {})
      expect(mocks.add).not.toHaveBeenCalled()
    }
  )
  it('rejects email identity in direct grants', async () => {
    req.body = { email: 'lucas@example.com', permission: 'editor' }
    await expectRejected(invoke(Controller.addUserByUsername), () => {})
    expect(mocks.findOne).not.toHaveBeenCalled()
  })
  it('protects the owner from grant and removal', async () => {
    privilege = 'owner'
    expect((await invoke(Controller.addUserByUsername)).status).toBe(409)
    req.params.username = 'luc.as'
    expect((await invoke(Controller.removeUserByUsername)).status).toBe(409)
    expect(mocks.add).not.toHaveBeenCalled()
    expect(mocks.remove).not.toHaveBeenCalled()
  })
  it('can remove a disabled account through the existing removal path', async () => {
    req.params.username = ' Luc.as '
    expect((await invoke(Controller.removeUserByUsername)).status).toBe(204)
    expect(mocks.findOne).toHaveBeenCalledWith(
      { username: 'luc.as' },
      expect.any(Object)
    )
    expect(req.params).toEqual({
      Project_id: projectId,
      user_id: userId.toString(),
    })
  })
  it('propagates a failed membership write without reporting success', async () => {
    const failure = new Error('Database unavailable')
    mocks.add.mockRejectedValue(failure)
    await expectRejected(invoke(Controller.addUserByUsername), rejection =>
      expect(rejection).toBe(failure)
    )
    expect(mocks.emit).not.toHaveBeenCalled()
  })
})
