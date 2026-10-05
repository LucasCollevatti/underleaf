import { beforeEach, describe, expect, it, vi } from 'vitest'
import mongodb from 'mongodb-legacy'

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
  owned: vi.fn(),
  userCount: vi.fn(),
  projectCount: vi.fn(),
  getUser: vi.fn(),
  settings: vi.fn(),
}))
vi.mock(
  '../../../../app/src/Features/Underleaf/UnderleafUserManager.mjs',
  () => {
    class UnderleafUserError extends Error {
      constructor(code, message) {
        super(message)
        this.code = code
      }
    }
    return {
      UnderleafUserError,
      default: {
        listUsers: mocks.list,
        createUser: mocks.create,
        updateUser: mocks.update,
        deleteUser: mocks.delete,
        countOwnedProjects: mocks.owned,
      },
    }
  }
)
vi.mock('../../../../app/src/infrastructure/mongodb.mjs', () => ({
  db: {
    users: { countDocuments: mocks.userCount },
    projects: { countDocuments: mocks.projectCount },
  },
}))
vi.mock('../../../../app/src/Features/User/UserGetter.mjs', () => ({
  default: { promises: { getUser: mocks.getUser } },
}))
vi.mock('../../../../app/src/Features/Project/UserSettingsHelper.mjs', () => ({
  default: {
    buildUserSettings: mocks.settings,
    getInitialTheme: value => (value === 'light-' ? 'light' : 'system'),
  },
}))
import Controller from '../../../../app/src/Features/Underleaf/UnderleafAdminController.mjs'
import { UnderleafUserError } from '../../../../app/src/Features/Underleaf/UnderleafUserManager.mjs'

const adminId = '000000000000000000000001'
const userId = new mongodb.ObjectId('000000000000000000000002')
let req, user
beforeEach(() => {
  vi.clearAllMocks()
  req = {
    params: { userId: userId.toString() },
    query: {},
    body: {},
    ip: '127.0.0.1',
    is: vi.fn().mockReturnValue(true),
    session: {
      passport: {
        user: {
          _id: adminId,
          username: 'administrator',
          status: 'active',
          identityVersion: 1,
        },
      },
    },
  }
  user = {
    _id: userId,
    username: 'alice',
    displayName: 'Alice',
    role: 'user',
    status: 'active',
    passwordHash: 'private-hash',
    identityVersion: 3,
    projectCount: 3,
  }
  mocks.list.mockResolvedValue([user])
  mocks.create.mockResolvedValue(user)
  mocks.update.mockResolvedValue(user)
  mocks.owned.mockResolvedValue(3)
  mocks.getUser.mockResolvedValue({ ace: { overallTheme: 'light-' } })
  mocks.settings.mockResolvedValue({ overallTheme: 'light-' })
  mocks.userCount
    .mockResolvedValueOnce(5)
    .mockResolvedValueOnce(4)
    .mockResolvedValueOnce(1)
  mocks.projectCount.mockResolvedValue(8)
})

function invoke(handler) {
  return new Promise((resolve, reject) => {
    const headers = {}
    const res = {
      statusCode: 200,
      status(code) {
        this.statusCode = code
        return this
      },
      set(key, value) {
        headers[key] = value
        return this
      },
      json(body) {
        resolve({ status: this.statusCode, body, headers })
      },
      render(view, data) {
        resolve({ view, data, headers })
      },
      redirect(location) {
        resolve({ location, headers })
      },
    }
    handler(req, res, reject)
  })
}

describe('Underleaf administration', () => {
  it('renders overview statistics using saved appearance and active administrator counts', async () => {
    const result = await invoke(Controller.index)
    expect(result.view).toBe('underleaf/admin')
    expect(result.data.adminPage.stats).toEqual({
      userCount: 5,
      activeUsers: 4,
      adminUsers: 1,
      projectCount: 8,
    })
    expect(mocks.userCount).toHaveBeenCalledWith({
      role: 'admin',
      status: 'active',
      suspended: { $ne: true },
    })
    expect(mocks.list).not.toHaveBeenCalled()
    expect(result.data.initialTheme).toBe('light')
    expect(result.headers['Cache-Control']).toBe('no-store')
  })
  it('hydrates users without password hashes or internal identity fields', async () => {
    const result = await invoke(Controller.users)
    expect(result.data.adminPage.currentUserId).toBe(adminId)
    expect(result.data.adminPage.users[0]).toEqual({
      id: userId.toString(),
      username: 'alice',
      displayName: 'Alice',
      role: 'user',
      status: 'active',
      projectCount: 3,
      createdAt: null,
      lastLoginAt: null,
    })
    expect(result.headers['Cache-Control']).toBe('no-store')
  })
  it('creates an account and returns only its public fields', async () => {
    req.body = {
      username: 'alice',
      displayName: 'Alice',
      role: 'user',
      password: 'strong-secret',
      confirmPassword: 'strong-secret',
    }
    const result = await invoke(Controller.createUser)
    expect(result.status).toBe(201)
    expect(mocks.create).toHaveBeenCalledWith({
      username: 'alice',
      displayName: 'Alice',
      role: 'user',
      password: 'strong-secret',
    })
    expect(result.body.user).not.toHaveProperty('passwordHash')
    expect(result.body.user).not.toHaveProperty('identityVersion')
  })
  it('rejects mismatching reset passwords without mutating an account', async () => {
    req.body = {
      password: 'strong-secret',
      confirmPassword: 'different-secret',
    }
    const result = await invoke(Controller.resetPassword)
    expect(result.status).toBe(400)
    expect(result.body.code).toBe('password_mismatch')
    expect(mocks.update).not.toHaveBeenCalled()
  })
  it('resets only the password without overwriting the username, role or status', async () => {
    req.body = { password: 'strong-secret', confirmPassword: 'strong-secret' }
    await invoke(Controller.resetPassword)
    expect(mocks.update).toHaveBeenCalledWith(userId, {
      password: 'strong-secret',
    })
  })
  it('changes only status and does not overwrite identity details', async () => {
    req.body = { status: 'disabled' }
    await invoke(Controller.setStatus)
    expect(mocks.update).toHaveBeenCalledWith(userId, { status: 'disabled' })
  })
  it('protects the current administrator against disable, demotion and deletion', async () => {
    req.params.userId = adminId
    req.body = { status: 'disabled' }
    expect((await invoke(Controller.setStatus)).status).toBe(409)
    req.body = { username: 'administrator', displayName: 'Admin', role: 'user' }
    expect((await invoke(Controller.updateUser)).status).toBe(409)
    req.body = { confirm: 'DELETE', projectAction: 'delete' }
    expect((await invoke(Controller.deleteUser)).status).toBe(409)
    expect(mocks.update).not.toHaveBeenCalled()
    expect(mocks.delete).not.toHaveBeenCalled()
  })
  it('surfaces the existing last-administrator protection inside the modal API', async () => {
    req.body = { status: 'disabled' }
    mocks.update.mockRejectedValueOnce(
      new UnderleafUserError(
        'last_admin',
        'The last active administrator cannot be disabled.'
      )
    )
    const result = await invoke(Controller.setStatus)
    expect(result.status).toBe(409)
    expect(result.body.code).toBe('last_admin')
  })
  it('cancels deletion without touching an account or its projects', async () => {
    req.body = { confirm: 'DELETE', projectAction: 'cancel' }
    expect((await invoke(Controller.deleteUser)).body.cancelled).toBe(true)
    expect(mocks.delete).not.toHaveBeenCalled()
  })
  it('requires exact confirmation before allowing explicit owned-project deletion', async () => {
    req.body = { confirm: 'delete', projectAction: 'delete' }
    await expect(invoke(Controller.deleteUser)).rejects.toThrow()
    expect(mocks.delete).not.toHaveBeenCalled()
    req.body.confirm = 'DELETE'
    const result = await invoke(Controller.deleteUser)
    expect(result.body.id).toBe(userId.toString())
    expect(mocks.delete).toHaveBeenCalledWith(
      userId,
      expect.objectContaining({ deleteProjects: true, ipAddress: '127.0.0.1' })
    )
  })
  it('keeps the HTML redirect fallback for non-JSON forms', async () => {
    req.is.mockReturnValue(false)
    req.body = { status: 'disabled' }
    expect((await invoke(Controller.setStatus)).location).toBe(
      '/admin/users?notice=User%20status%20updated.'
    )
  })
})
