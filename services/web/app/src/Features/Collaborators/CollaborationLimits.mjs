// @ts-check

import { callbackify } from 'node:util'

async function allowedNumberOfCollaboratorsInProject() {
  return -1
}

async function allowedNumberOfCollaboratorsForUser() {
  return -1
}

async function canAcceptEditCollaboratorInvite() {
  return true
}

async function canAddXEditCollaborators() {
  return true
}

async function canChangeCollaboratorPrivilegeLevel() {
  return true
}

const CollaborationLimits = {
  allowedNumberOfCollaboratorsInProject: callbackify(
    allowedNumberOfCollaboratorsInProject
  ),
  allowedNumberOfCollaboratorsForUser: callbackify(
    allowedNumberOfCollaboratorsForUser
  ),
  canAddXEditCollaborators: callbackify(canAddXEditCollaborators),
  canChangeCollaboratorPrivilegeLevel: callbackify(
    canChangeCollaboratorPrivilegeLevel
  ),
  promises: {
    allowedNumberOfCollaboratorsInProject,
    allowedNumberOfCollaboratorsForUser,
    canAcceptEditCollaboratorInvite,
    canAddXEditCollaborators,
    canChangeCollaboratorPrivilegeLevel,
  },
}

export default CollaborationLimits
