import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findOne: vi.fn(),
  find: vi.fn(),
  hooks: vi.fn(),
  computeFeatures: vi.fn(),
  normalizeQuery: vi.fn(query =>
    typeof query === 'string' ? { _id: query } : query
  ),
  normalizeMultiQuery: vi.fn(query =>
    Array.isArray(query) ? { _id: { $in: query } } : query
  ),
}))
vi.mock('@overleaf/settings', () => ({ default: { underleaf: true } }))
vi.mock('@overleaf/logger', () => ({ default: {} }))
vi.mock('moment', () => ({ default: vi.fn() }))
vi.mock('../../../../app/src/infrastructure/mongodb.mjs', () => ({
  db: { users: { findOne: mocks.findOne, find: mocks.find } },
}))
vi.mock('../../../../app/src/models/User.mjs', () => ({ User: {} }))
vi.mock('../../../../app/src/Features/Helpers/Mongo.mjs', () => ({
  default: {
    normalizeQuery: mocks.normalizeQuery,
    normalizeMultiQuery: mocks.normalizeMultiQuery,
  },
}))
vi.mock(
  '../../../../app/src/Features/Institutions/InstitutionsAPI.mjs',
  () => ({ default: { promises: {} } })
)
vi.mock(
  '../../../../app/src/Features/Institutions/InstitutionsHelper.mjs',
  () => ({ default: {} })
)
vi.mock('../../../../app/src/Features/Errors/Errors.js', () => ({
  default: {},
}))
vi.mock('../../../../app/src/infrastructure/Features.mjs', () => ({
  default: {},
}))
vi.mock('../../../../app/src/infrastructure/Modules.mjs', () => ({
  default: { promises: { hooks: { fire: mocks.hooks } } },
}))
vi.mock('../../../../app/src/Features/Subscription/FeaturesHelper.mjs', () => ({
  default: { computeFeatureSet: mocks.computeFeatures },
}))
vi.mock('../../../../app/src/infrastructure/AsyncLocalStorage.mjs', () => ({
  default: { storage: { getStore: () => undefined } },
}))

import UserGetter from '../../../../app/src/Features/User/UserGetter.mjs'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.findOne.mockResolvedValue({
    _id: 'id',
    username: 'alpha',
    displayName: 'Alpha',
  })
  mocks.find.mockReturnValue({
    toArray: async () => [{ _id: 'id', username: 'alpha' }],
  })
})

describe('UserGetter canonical account data', () => {
  it('gets account identity by ID with a username projection', async () => {
    const projection = { username: 1, displayName: 1 }
    expect(await UserGetter.promises.getUser('id', projection)).toMatchObject({
      username: 'alpha',
      displayName: 'Alpha',
    })
    expect(mocks.findOne).toHaveBeenCalledWith({ _id: 'id' }, { projection })
  })
  it('gets several identities without querying by email', async () => {
    const projection = { username: 1 }
    expect(await UserGetter.promises.getUsers(['id'], projection)).toEqual([
      { _id: 'id', username: 'alpha' },
    ])
    expect(mocks.find).toHaveBeenCalledWith(
      { _id: { $in: ['id'] } },
      { projection }
    )
  })
  it('short-circuits empty user lists', async () => {
    expect(await UserGetter.promises.getUsers([], { username: 1 })).toEqual([])
    expect(mocks.find).not.toHaveBeenCalled()
  })
  it('returns no confirmation or secondary-email data in Underleaf', async () => {
    expect(await UserGetter.promises.getUserFullEmails('id')).toEqual([])
    expect(await UserGetter.promises.getUserConfirmedEmails('id')).toEqual([])
    expect(mocks.findOne).not.toHaveBeenCalled()
  })
  it('preserves editor feature resolution and module-provided features', async () => {
    mocks.findOne.mockResolvedValue({ features: { compileTimeout: 3600 } })
    mocks.hooks.mockResolvedValue([{ trackChanges: true }])
    mocks.computeFeatures.mockReturnValue({
      compileTimeout: 3600,
      trackChanges: true,
    })
    expect(await UserGetter.promises.getUserFeatures('id')).toEqual({
      compileTimeout: 3600,
      trackChanges: true,
    })
    expect(mocks.computeFeatures).toHaveBeenCalledWith([
      { compileTimeout: 3600 },
      { trackChanges: true },
    ])
  })
  it('reports missing accounts when resolving features', async () => {
    mocks.findOne.mockResolvedValue(null)
    await expect(UserGetter.promises.getUserFeatures('id')).rejects.toThrow(
      'User not Found'
    )
  })
  it('propagates database failures', async () => {
    const error = new Error('Database unavailable')
    mocks.findOne.mockRejectedValue(error)
    await expect(UserGetter.promises.getUser('id')).rejects.toBe(error)
  })
  it('preserves reference integration data independently of identity', async () => {
    mocks.findOne.mockResolvedValue({
      writefull: { isPremium: true, premiumSource: 'local' },
    })
    expect(await UserGetter.promises.getWritefullData('id')).toEqual({
      isPremium: true,
      premiumSource: 'local',
    })
  })
})
