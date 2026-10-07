import { type FormEvent, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import OLButton from '@/shared/components/ol/ol-button'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import {
  OLModal,
  OLModalBody,
  OLModalFooter,
  OLModalHeader,
  OLModalTitle,
} from '@/shared/components/ol/ol-modal'
import { FetchError, postJSON } from '@/infrastructure/fetch-json'
import type {
  UnderleafUserAction,
  UnderleafUserMutationResult,
} from '../../../../../types/underleaf-admin'

const titleKeys = {
  create: 'underleaf_create_user',
  edit: 'underleaf_edit_user',
  password: 'underleaf_reset_password',
  delete: 'underleaf_delete_user',
}

const errorKeys: Record<string, string> = {
  invalid_username: 'underleaf_invalid_username',
  username_taken: 'underleaf_username_taken',
  password_mismatch: 'underleaf_password_mismatch',
  invalid_password: 'underleaf_invalid_password',
  too_short: 'underleaf_invalid_password',
  too_long: 'underleaf_invalid_password',
  invalid_character: 'underleaf_invalid_password',
  last_admin: 'underleaf_last_admin_guard',
  concurrent_update: 'underleaf_account_changed',
}

export default function UserActionModal({
  action,
  currentUserId,
  onHide,
  onSuccess,
}: {
  action: UnderleafUserAction
  currentUserId: string
  onHide: () => void
  onSuccess: (result: UnderleafUserMutationResult) => void
}) {
  const { t } = useTranslation()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [projectAction, setProjectAction] = useState('cancel')
  const inflight = useRef(false)
  const user = action.kind === 'create' ? null : action.user
  const ownAccount = user?.id === currentUserId
  const disabling = user?.status === 'active'
  const title = t(
    action.kind === 'status'
      ? disabling
        ? 'underleaf_disable_user'
        : 'underleaf_enable_user'
      : titleKeys[action.kind]
  )
  const hasIdentity = action.kind === 'create' || action.kind === 'edit'
  const hasPassword = action.kind === 'create' || action.kind === 'password'
  const canDelete = confirmation === 'DELETE' && projectAction === 'delete'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (inflight.current || (action.kind === 'delete' && !canDelete)) return
    const fields = new FormData(event.currentTarget)
    const field = (name: string) => String(fields.get(name) ?? '')
    if (hasPassword && field('password') !== field('confirmPassword')) {
      setError(t('underleaf_password_mismatch'))
      return
    }
    const body: Record<string, string> = {}
    let path = '/admin/users'
    if (user) path += `/${encodeURIComponent(user.id)}`
    if (hasIdentity) {
      body.username = field('username')
      body.displayName = field('displayName')
      body.role = ownAccount ? 'admin' : field('role')
    }
    if (hasPassword) {
      body.password = field('password')
      body.confirmPassword = field('confirmPassword')
    }
    if (action.kind === 'password') path += '/password'
    if (action.kind === 'status') {
      path += '/status'
      body.status = disabling ? 'disabled' : 'active'
    }
    if (action.kind === 'delete') {
      path += '/delete'
      body.confirm = confirmation
      body.projectAction = projectAction
    }
    inflight.current = true
    setBusy(true)
    setError('')
    try {
      const result = await postJSON<UnderleafUserMutationResult>(path, { body })
      // A redirected login page must not be mistaken for a successful mutation.
      if (action.kind === 'delete' ? result.id !== user?.id : !result.user)
        throw new Error('Invalid account response')
      const messages = {
        create: 'underleaf_user_created',
        edit: 'underleaf_user_updated',
        password: 'underleaf_password_reset',
        status: 'underleaf_user_status_updated',
        delete: 'underleaf_user_deleted',
      }
      onSuccess({ ...result, message: t(messages[action.kind]) })
    } catch (cause) {
      const errorKey =
        cause instanceof FetchError ? errorKeys[cause.data?.code] : undefined
      setError(
        errorKey
          ? t(errorKey)
          : cause instanceof FetchError
            ? cause.getUserFacingMessage()
            : t('underleaf_admin_operation_failed')
      )
    } finally {
      inflight.current = false
      setBusy(false)
    }
  }

  return (
    <OLModal
      show
      className="underleaf-user-action-modal"
      backdropClassName="underleaf-user-action-backdrop"
      centered
      onHide={() => {
        if (!inflight.current) onHide()
      }}
      themed
      backdrop={busy ? 'static' : true}
      keyboard={!busy}
      aria-labelledby="underleaf-user-action-title"
    >
      <form onSubmit={submit}>
        <OLModalHeader closeButton={!busy}>
          <OLModalTitle id="underleaf-user-action-title">{title}</OLModalTitle>
        </OLModalHeader>
        <OLModalBody>
          {action.kind === 'create' && (
            <p className="underleaf-user-modal-description">
              Create a local account on this instance.
            </p>
          )}
          {user && (
            <p>
              <strong>@{user.username}</strong> · {user.displayName}
            </p>
          )}
          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}
          <fieldset disabled={busy} className="underleaf-admin-fields">
            <legend className="visually-hidden">{title}</legend>
            {hasIdentity && (
              <>
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-username">
                    {t('underleaf_username')}
                  </OLFormLabel>
                  <OLFormControl
                    id="admin-username"
                    name="username"
                    defaultValue={user?.username || ''}
                    required
                    minLength={3}
                    maxLength={32}
                    pattern="[A-Za-z0-9]([A-Za-z0-9._]|-){1,30}[A-Za-z0-9]"
                    autoComplete="off"
                    autoCapitalize="none"
                    spellCheck={false}
                    aria-describedby="admin-username-help"
                    autoFocus
                  />
                  <p id="admin-username-help" className="small mt-1">
                    {t('underleaf_username_help')}
                  </p>
                </div>
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-display-name">
                    {t('underleaf_display_name')}
                  </OLFormLabel>
                  <OLFormControl
                    id="admin-display-name"
                    name="displayName"
                    defaultValue={user?.displayName || ''}
                    required={action.kind === 'edit'}
                    maxLength={255}
                    autoComplete="off"
                  />
                </div>
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-role">
                    {t('underleaf_role')}
                  </OLFormLabel>
                  <select
                    id="admin-role"
                    name="role"
                    className="form-select"
                    defaultValue={user?.role || 'user'}
                    disabled={ownAccount}
                  >
                    <option value="user">{t('underleaf_user_role')}</option>
                    <option value="admin">
                      {t('underleaf_administrator')}
                    </option>
                  </select>
                  {ownAccount && (
                    <p className="small mt-1">
                      {t('underleaf_own_admin_guard')}
                    </p>
                  )}
                </div>
              </>
            )}
            {hasPassword && (
              <>
                {action.kind === 'password' && (
                  <p>{t('underleaf_reset_password_help')}</p>
                )}
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-password">
                    {t('underleaf_password')}
                  </OLFormLabel>
                  <OLFormControl
                    id="admin-password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    autoFocus={action.kind === 'password'}
                  />
                </div>
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-confirm-password">
                    {t('underleaf_confirm_password')}
                  </OLFormLabel>
                  <OLFormControl
                    id="admin-confirm-password"
                    name="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}
            {action.kind === 'status' && (
              <p>
                {t(
                  disabling
                    ? 'underleaf_disable_user_help'
                    : 'underleaf_enable_user_help'
                )}
              </p>
            )}
            {action.kind === 'delete' && (
              <>
                <p className="alert alert-warning" role="alert">
                  {t('underleaf_delete_user_warning', {
                    count: user?.projectCount,
                  })}
                </p>
                <p>{t('underleaf_delete_user_preserve_projects')}</p>
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-project-action">
                    {t('underleaf_owned_projects_action')}
                  </OLFormLabel>
                  <select
                    id="admin-project-action"
                    className="form-select"
                    value={projectAction}
                    onChange={event => setProjectAction(event.target.value)}
                    autoFocus
                  >
                    <option value="cancel">
                      {t('underleaf_keep_account_projects')}
                    </option>
                    <option value="delete">
                      {t('underleaf_delete_account_projects')}
                    </option>
                  </select>
                </div>
                <div className="mb-3">
                  <OLFormLabel htmlFor="admin-delete-confirm">
                    {t('underleaf_type_delete')}
                  </OLFormLabel>
                  <OLFormControl
                    id="admin-delete-confirm"
                    name="confirm"
                    value={confirmation}
                    onChange={event => setConfirmation(event.target.value)}
                    autoComplete="off"
                    spellCheck={false}
                    required
                  />
                </div>
              </>
            )}
          </fieldset>
        </OLModalBody>
        <OLModalFooter>
          <OLButton
            variant="secondary"
            type="button"
            disabled={busy}
            onClick={onHide}
          >
            {t('cancel')}
          </OLButton>
          <OLButton
            variant={action.kind === 'delete' ? 'danger' : 'primary'}
            type="submit"
            isLoading={busy}
            disabled={action.kind === 'delete' && !canDelete}
          >
            {action.kind === 'edit' ? t('save') : title}
          </OLButton>
        </OLModalFooter>
      </form>
    </OLModal>
  )
}
