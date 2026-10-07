import _ from 'lodash'
import { callbackify } from 'node:util'
import { callbackifyMultiResult } from '@overleaf/promise-utils'
import Settings from '@overleaf/settings'
import UserGetter from '../User/UserGetter.mjs'
import UserFeaturesUpdater from './UserFeaturesUpdater.mjs'
import FeaturesHelper from './FeaturesHelper.mjs'
import Queues from '../../infrastructure/Queues.mjs'

async function scheduleRefreshFeatures(userId, reason) {
  const queue = Queues.getQueue('refresh-features')
  await queue.add({ userId, reason })
}

function featuresEpochIsCurrent(user) {
  return Settings.featuresEpoch
    ? user.featuresEpoch === Settings.featuresEpoch
    : true
}

async function computeFeatures(userId) {
  const user = await UserGetter.promises.getUser(userId, {
    featuresOverrides: 1,
  })
  const overrides = (user?.featuresOverrides || [])
    .filter(item => !item.expiresAt || item.expiresAt > new Date())
    .map(item => item.features)
  return _.reduce(overrides, FeaturesHelper.mergeFeatures, {
    ...Settings.defaultFeatures,
  })
}

async function refreshFeatures(userId) {
  const features = await computeFeatures(userId)
  return await UserFeaturesUpdater.promises.updateFeatures(userId, features)
}

async function doSyncFromV1() {
  return { features: {}, featuresChanged: false }
}

export default {
  featuresEpochIsCurrent,
  computeFeatures: callbackify(computeFeatures),
  refreshFeatures: callbackifyMultiResult(refreshFeatures, [
    'features',
    'featuresChanged',
  ]),
  doSyncFromV1: callbackifyMultiResult(doSyncFromV1, [
    'features',
    'featuresChanged',
  ]),
  scheduleRefreshFeatures: callbackify(scheduleRefreshFeatures),
  promises: {
    computeFeatures,
    refreshFeatures,
    scheduleRefreshFeatures,
    doSyncFromV1,
  },
}
