import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getUserFacingMessage,
  postJSON,
} from '../../../infrastructure/fetch-json'
import useAsync from '../../../shared/hooks/use-async'
import { useUserContext } from '../../../shared/context/user-context'
import OLButton from '@/shared/components/ol/ol-button'
import Notification from '@/shared/components/notification'
import OLFormGroup from '@/shared/components/ol/ol-form-group'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormText from '@/shared/components/ol/ol-form-text'

function AccountInfoSection() {
  const { t } = useTranslation()
  const { username, displayName: initialDisplayName } = useUserContext()
  const [displayName, setDisplayName] = useState(initialDisplayName || username)
  const { isLoading, isSuccess, isError, error, runAsync } = useAsync()

  return (
    <>
      <h3 id="update-account-info">{t('update_account_info')}</h3>
      <form
        id="account-info-form"
        onSubmit={event => {
          event.preventDefault()
          runAsync(
            postJSON('/user/settings', {
              body: { displayName: displayName.trim() },
            })
          ).catch(() => {})
        }}
      >
        <OLFormGroup controlId="username-input">
          <OLFormLabel>Username</OLFormLabel>
          <OLFormControl readOnly value={username} autoComplete="username" />
          <OLFormText>Your administrator manages your username.</OLFormText>
        </OLFormGroup>
        <ReadOrWriteFormGroup
          id="display-name-input"
          type="text"
          label="Display name"
          value={displayName}
          maxLength={255}
          handleChange={event => setDisplayName(event.target.value)}
          canEdit
          required
        />
        {isSuccess && (
          <Notification type="success" content={t('thanks_settings_updated')} />
        )}
        {isError && (
          <Notification
            type="error"
            content={getUserFacingMessage(error) ?? ''}
          />
        )}
        <OLButton
          type="submit"
          variant="primary"
          isLoading={isLoading}
          disabled={isLoading || !displayName?.trim()}
        >
          {t('update')}
        </OLButton>
      </form>
    </>
  )
}

type ReadOrWriteFormGroupProps = {
  id: string
  type: string
  label: string
  value?: string
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  canEdit: boolean
  maxLength?: number
  required: boolean
}

function ReadOrWriteFormGroup({
  id,
  type,
  label,
  value,
  handleChange,
  canEdit,
  maxLength,
  required,
}: ReadOrWriteFormGroupProps) {
  const [validationMessage, setValidationMessage] = useState('')

  const handleInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
    event.preventDefault()
  }

  const handleChangeAndValidity = (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    handleChange(event)
    setValidationMessage(event.target.validationMessage)
  }

  if (!canEdit) {
    return (
      <OLFormGroup controlId={id}>
        <OLFormLabel>{label}</OLFormLabel>
        <OLFormControl type="text" readOnly value={value} />
      </OLFormGroup>
    )
  }

  return (
    <OLFormGroup controlId={id}>
      <OLFormLabel>{label}</OLFormLabel>
      <OLFormControl
        type={type}
        required={required}
        value={value}
        maxLength={maxLength}
        data-ol-dirty={!!validationMessage}
        onChange={handleChangeAndValidity}
        onInvalid={handleInvalid}
      />
      {validationMessage && (
        <OLFormText type="error">{validationMessage}</OLFormText>
      )}
    </OLFormGroup>
  )
}

export default AccountInfoSection
