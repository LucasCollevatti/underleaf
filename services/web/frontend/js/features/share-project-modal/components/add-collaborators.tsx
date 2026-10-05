import { useState } from 'react'
import { useProjectContext } from '@/shared/context/project-context'
import { useShareProjectContext } from './share-project-modal'
import { getUserFacingMessage, putJSON } from '@/infrastructure/fetch-json'
import OLForm from '@/shared/components/ol/ol-form'
import OLFormGroup from '@/shared/components/ol/ol-form-group'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormText from '@/shared/components/ol/ol-form-text'
import OLButton from '@/shared/components/ol/ol-button'

export default function AddCollaborators({ readOnly }: { readOnly?: boolean }) {
  const { projectId } = useProjectContext()
  const { setInFlight, setError } = useShareProjectContext()
  const [username, setUsername] = useState('')
  const [permission, setPermission] = useState<'editor' | 'viewer'>('editor')
  const [busy, setBusy] = useState(false)

  return (
    <OLForm
      className="add-collabs"
      onSubmit={async event => {
        event.preventDefault()
        setBusy(true)
        setInFlight(true)
        setError(undefined)
        try {
          await putJSON(`/project/${projectId}/users/by-username`, {
            body: {
              username: username.trim().toLowerCase(),
              permission: readOnly ? 'viewer' : permission,
            },
          })
          setUsername('')
        } catch (error) {
          setError(
            getUserFacingMessage(error) ||
              'Could not add this user. Check their username.'
          )
        } finally {
          setBusy(false)
          setInFlight(false)
        }
      }}
    >
      <OLFormGroup controlId="collaborator-username">
        <OLFormLabel>Username</OLFormLabel>
        <OLFormControl
          value={username}
          onChange={event => setUsername(event.target.value)}
          required
          minLength={3}
          maxLength={32}
          autoComplete="off"
        />
        <OLFormText>Add an existing Underleaf account.</OLFormText>
      </OLFormGroup>
      <OLFormGroup controlId="collaborator-permission">
        <OLFormLabel>Permission</OLFormLabel>
        <select
          id="collaborator-permission"
          className="form-select"
          value={readOnly ? 'viewer' : permission}
          disabled={readOnly}
          onChange={event =>
            setPermission(event.target.value as 'editor' | 'viewer')
          }
        >
          <option value="editor">Editor</option>
          <option value="viewer">Viewer</option>
        </select>
      </OLFormGroup>
      <OLButton
        type="submit"
        variant="primary"
        disabled={busy || !username.trim()}
        isLoading={busy}
      >
        Add collaborator
      </OLButton>
    </OLForm>
  )
}
