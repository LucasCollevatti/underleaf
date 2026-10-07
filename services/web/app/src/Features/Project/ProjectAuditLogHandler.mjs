import logger from '@overleaf/logger'
import { ProjectAuditLogEntry } from '../../models/ProjectAuditLogEntry.mjs'
import { callbackify } from '@overleaf/promise-utils'

const MANAGED_GROUP_PROJECT_EVENTS = []

async function addEntry(
  projectId,
  operation,
  initiatorId,
  ipAddress,
  info = {}
) {
  await ProjectAuditLogEntry.create({
    projectId,
    operation,
    initiatorId,
    ipAddress,
    info,
  })
}

async function addEntryIfManaged() {}

function addEntryInBackground(
  projectId,
  operation,
  initiatorId,
  ipAddress,
  info = {}
) {
  addEntry(projectId, operation, initiatorId, ipAddress, info).catch(err => {
    logger.error(
      { err, projectId, operation, initiatorId, ipAddress, info },
      'Failed to write audit log'
    )
  })
}

function addEntryIfManagedInBackground() {}

export default {
  promises: {
    addEntry,
    addEntryIfManaged,
  },
  addEntry: callbackify(addEntry),
  addEntryIfManaged: callbackify(addEntryIfManaged),
  addEntryInBackground,
  addEntryIfManagedInBackground,
  MANAGED_GROUP_PROJECT_EVENTS,
}
