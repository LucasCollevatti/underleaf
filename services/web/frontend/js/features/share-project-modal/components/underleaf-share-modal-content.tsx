import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useProjectContext } from '@/shared/context/project-context'
import { useEditorContext } from '@/shared/context/editor-context'
import type {
  ProjectMember,
  EditAccessRequest,
} from '@/shared/context/types/project-metadata'
import {
  deleteJSON,
  getUserFacingMessage,
  putJSON,
} from '@/infrastructure/fetch-json'
import { useShareProjectContext } from './share-project-modal'
import AddCollaborators from './add-collaborators'
import TransferOwnershipModal from './transfer-ownership-modal'
import LinkSharing, { ReadOnlyTokenLink } from './link-sharing'
import { declineAccessRequest, grantAccessRequest } from '../utils/api'
import Notification from '@/shared/components/notification'
import OLButton from '@/shared/components/ol/ol-button'
import {
  OLModalBody,
  OLModalFooter,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'

export default function UnderleafShareModalContent({
  cancel,
}: {
  cancel: () => void
}) {
  const { t } = useTranslation()
  const { project } = useProjectContext()
  const { isProjectOwner, isRestrictedTokenMember } = useEditorContext()
  const { error, inFlight, successActionMessage } = useShareProjectContext()

  return (
    <>
      <OLModalHeader>
        <OLModalTitle>
          {t('share_project')} — {project?.name}
        </OLModalTitle>
      </OLModalHeader>
      <OLModalBody>
        {isRestrictedTokenMember ? (
          <ReadOnlyTokenLink />
        ) : (
          <>
            {isProjectOwner ? (
              <AddCollaborators />
            ) : (
              <p>Only the project owner can manage access.</p>
            )}
            <h3>People with access</h3>
            <div className="d-flex justify-content-between py-2">
              <span>
                {project?.owner.displayName || project?.owner.username} (
                {project?.owner.username})
              </span>
              <strong>{t('owner')}</strong>
            </div>
            {project?.members.map(member => (
              <MemberRow
                key={member._id}
                member={member}
                canManage={isProjectOwner}
              />
            ))}
            {isProjectOwner &&
              project?.editAccessRequests?.map(request => (
                <AccessRequestRow key={request._id} request={request} />
              ))}
            {isProjectOwner && <LinkSharing />}
          </>
        )}
        {error && (
          <Notification
            type="error"
            content={t(error, { defaultValue: error })}
          />
        )}
        {successActionMessage && (
          <p role="status" aria-live="polite">
            {successActionMessage}
          </p>
        )}
      </OLModalBody>
      <OLModalFooter>
        <OLButton variant="secondary" onClick={cancel} disabled={inFlight}>
          {t('close')}
        </OLButton>
      </OLModalFooter>
    </>
  )
}

function MemberRow({
  member,
  canManage,
}: {
  member: ProjectMember
  canManage: boolean
}) {
  const { t } = useTranslation()
  const { projectId, project, updateProject } = useProjectContext()
  const { inFlight, setInFlight, setError, setSuccessActionMessage } =
    useShareProjectContext()
  const [permission, setPermission] = useState(member.privileges)
  const [confirmRemoval, setConfirmRemoval] = useState(false)
  const [transferOwnership, setTransferOwnership] = useState(false)
  const membersRef = useRef(project?.members ?? [])
  membersRef.current = project?.members ?? []
  useEffect(() => {
    setPermission(member.privileges)
  }, [member.privileges])

  async function changeAccess(remove: boolean, privilege = permission) {
    setError(undefined)
    setSuccessActionMessage(undefined)
    setInFlight(true)
    try {
      const path = `/project/${projectId}/users/by-username/${encodeURIComponent(member.username)}`
      if (remove) {
        await deleteJSON(path)
        updateProject({
          members: membersRef.current.filter(item => item._id !== member._id),
        })
        setSuccessActionMessage(`${member.username} no longer has access.`)
      } else {
        await putJSON(`/project/${projectId}/users/by-username`, {
          body: {
            username: member.username,
            permission: privilege === 'readOnly' ? 'viewer' : 'editor',
          },
        })
        updateProject({
          members: membersRef.current.map(item =>
            item._id === member._id
              ? {
                  ...item,
                  privileges: privilege,
                  pendingEditor: false,
                  pendingReviewer: false,
                }
              : item
          ),
        })
        setPermission(privilege)
        setSuccessActionMessage(`Access updated for ${member.username}.`)
      }
    } catch (error) {
      setError(getUserFacingMessage(error))
      setPermission(member.privileges)
    } finally {
      setInFlight(false)
    }
  }

  return (
    <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 py-2">
      <span>
        {member.displayName || member.username} ({member.username})
      </span>
      {canManage ? (
        <div className="d-flex flex-wrap gap-2">
          <select
            className="form-select w-auto"
            aria-label={`Permission for ${member.username}`}
            value={permission}
            disabled={inFlight}
            onChange={event => {
              void changeAccess(
                false,
                event.target.value as ProjectMember['privileges']
              )
            }}
          >
            <option value="readAndWrite">{t('editor')}</option>
            <option value="readOnly">{t('viewer')}</option>
            {member.privileges === 'review' && (
              <option value="review" disabled>
                {t('reviewer')}
              </option>
            )}
          </select>
          {confirmRemoval ? (
            <>
              <OLButton
                variant="danger"
                disabled={inFlight}
                onClick={() => {
                  void changeAccess(true)
                }}
              >
                Confirm removal
              </OLButton>
              <OLButton
                variant="secondary"
                disabled={inFlight}
                onClick={() => setConfirmRemoval(false)}
              >
                {t('cancel')}
              </OLButton>
            </>
          ) : (
            <>
              <OLButton
                variant="secondary"
                disabled={inFlight}
                onClick={() => setConfirmRemoval(true)}
              >
                Remove {member.username}
              </OLButton>
              <OLButton
                variant="link"
                disabled={inFlight}
                onClick={() => setTransferOwnership(true)}
              >
                Make {member.username} owner
              </OLButton>
            </>
          )}
          {transferOwnership && (
            <TransferOwnershipModal
              member={member}
              cancel={() => setTransferOwnership(false)}
            />
          )}
        </div>
      ) : (
        <span>
          {t(
            member.privileges === 'readOnly'
              ? 'viewer'
              : member.privileges === 'review'
                ? 'reviewer'
                : 'editor'
          )}
        </span>
      )}
    </div>
  )
}

function AccessRequestRow({ request }: { request: EditAccessRequest }) {
  const { projectId, project, updateProject } = useProjectContext()
  const { inFlight, setInFlight, setError, setSuccessActionMessage } =
    useShareProjectContext()
  const projectRef = useRef(project)
  projectRef.current = project
  async function decide(grant: boolean) {
    setError(undefined)
    setSuccessActionMessage(undefined)
    setInFlight(true)
    try {
      if (grant)
        await grantAccessRequest(projectId, request._id, 'readAndWrite', false)
      else await declineAccessRequest(projectId, request._id, false)
      updateProject({
        editAccessRequests: projectRef.current?.editAccessRequests?.filter(
          item => item._id !== request._id
        ),
        ...(grant
          ? {
              members: [
                ...(projectRef.current?.members ?? []).filter(
                  member => member._id !== request._id
                ),
                {
                  _id: request._id,
                  username: request.username,
                  displayName: request.displayName,
                  first_name: request.first_name,
                  last_name: request.last_name,
                  privileges: 'readAndWrite' as const,
                },
              ],
            }
          : {}),
      })
      setSuccessActionMessage(
        `Access request ${grant ? 'accepted' : 'declined'} for ${request.username}.`
      )
    } catch (error) {
      setError(getUserFacingMessage(error))
    } finally {
      setInFlight(false)
    }
  }
  return (
    <div className="d-flex flex-wrap justify-content-between gap-2 py-2">
      <span>{request.username} requests edit access.</span>
      <div className="d-flex gap-2">
        <OLButton
          variant="primary"
          disabled={inFlight}
          onClick={() => {
            void decide(true)
          }}
        >
          Grant editor access
        </OLButton>
        <OLButton
          variant="secondary"
          disabled={inFlight}
          onClick={() => {
            void decide(false)
          }}
        >
          Decline request
        </OLButton>
      </div>
    </div>
  )
}
