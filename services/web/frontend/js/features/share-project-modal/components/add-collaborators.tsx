import { useEffect, useRef, useState } from 'react'
import { useProjectContext } from '@/shared/context/project-context'
import { useShareProjectContext } from './share-project-modal'
import {
  getJSON,
  getUserFacingMessage,
  putJSON,
} from '@/infrastructure/fetch-json'
import type { ProjectMember } from '@/shared/context/types/project-metadata'
import OLForm from '@/shared/components/ol/ol-form'
import OLFormGroup from '@/shared/components/ol/ol-form-group'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormText from '@/shared/components/ol/ol-form-text'
import OLButton from '@/shared/components/ol/ol-button'

export default function AddCollaborators({ readOnly }: { readOnly?: boolean }) {
  const { projectId, project, updateProject } = useProjectContext()
  const { inFlight, setInFlight, setError, setSuccessActionMessage } =
    useShareProjectContext()
  const [username, setUsername] = useState('')
  const [permission, setPermission] = useState<'editor' | 'viewer'>('editor')
  const [busy, setBusy] = useState(false)
  const [results, setResults] = useState<
    { id: string; username: string; displayName: string }[]
  >([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string>()
  const membersRef = useRef(project?.members ?? [])
  membersRef.current = project?.members ?? []
  const prefix = username.trim().toLowerCase()

  useEffect(() => {
    setResults([])
    setSearchError(undefined)
    setSearching(false)
    if (!/^[a-z0-9][a-z0-9._-]{1,31}$/.test(prefix)) return
    const controller = new AbortController()
    setSearching(true)
    const timer = window.setTimeout(async () => {
      try {
        const data = await getJSON<{ users: typeof results }>(
          `/underleaf/users/search?username=${encodeURIComponent(prefix)}`,
          { signal: controller.signal, swallowAbortError: false }
        )
        if (!controller.signal.aborted) setResults(data.users)
      } catch (error) {
        if (!controller.signal.aborted)
          setSearchError(getUserFacingMessage(error))
      } finally {
        if (!controller.signal.aborted) setSearching(false)
      }
    }, 250)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [prefix])

  const candidates = results.filter(
    user =>
      user.username !== project?.owner.username &&
      !project?.members.some(member => member.username === user.username)
  )

  return (
    <OLForm
      className="add-collabs"
      onSubmit={async event => {
        event.preventDefault()
        setBusy(true)
        setInFlight(true)
        setError(undefined)
        setSuccessActionMessage(undefined)
        try {
          const { member } = await putJSON<{ member: ProjectMember }>(
            `/project/${projectId}/users/by-username`,
            {
              body: {
                username: username.trim().toLowerCase(),
                permission: readOnly ? 'viewer' : permission,
              },
            }
          )
          updateProject({
            members: [
              ...membersRef.current.filter(
                existing => existing._id !== member._id
              ),
              member,
            ],
          })
          setSuccessActionMessage(`${member.username} now has access.`)
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
          onBlur={() => setUsername(prefix)}
          required
          minLength={3}
          maxLength={32}
          pattern="[A-Za-z0-9]([A-Za-z0-9._]|-){1,30}[A-Za-z0-9]"
          autoComplete="off"
          disabled={inFlight}
          aria-describedby="username-search-status"
        />
        <OLFormText>Add an existing Underleaf account.</OLFormText>
        <div id="username-search-status" role="status" aria-live="polite">
          {searching && <p>Searching users…</p>}
          {searchError && <p>{searchError}</p>}
          {!searching &&
            !searchError &&
            prefix.length >= 2 &&
            candidates.length === 0 && (
              <p>
                No matching users available. Ask your administrator to create an
                account if needed.
              </p>
            )}
        </div>
        {candidates.length > 0 && (
          <ul className="list-unstyled" aria-label="Matching users">
            {candidates.map(user => (
              <li key={user.id}>
                <OLButton
                  variant="link"
                  type="button"
                  disabled={inFlight}
                  onClick={() => setUsername(user.username)}
                >
                  {user.displayName} ({user.username})
                </OLButton>
              </li>
            ))}
          </ul>
        )}
      </OLFormGroup>
      <OLFormGroup controlId="collaborator-permission">
        <OLFormLabel>Permission</OLFormLabel>
        <select
          id="collaborator-permission"
          className="form-select"
          value={readOnly ? 'viewer' : permission}
          disabled={readOnly || inFlight}
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
        disabled={inFlight || busy || !username.trim()}
        isLoading={busy}
      >
        Add collaborator
      </OLButton>
    </OLForm>
  )
}
