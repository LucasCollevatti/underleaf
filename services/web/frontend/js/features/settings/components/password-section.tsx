import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  getUserFacingMessage,
  postJSON,
} from '../../../infrastructure/fetch-json'
import getMeta from '../../../utils/meta'
import useAsync from '../../../shared/hooks/use-async'
import OLButton from '@/shared/components/ol/ol-button'
import Notification from '@/shared/components/notification'
import OLFormGroup from '@/shared/components/ol/ol-form-group'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormText from '@/shared/components/ol/ol-form-text'

type PasswordUpdateResult = {
  message?: {
    text: string
  }
}

function PasswordSection() {
  const { t } = useTranslation()
  const hasPassword = getMeta('ol-hasPassword')
  return (
    <>
      <h3>{t('change_password')}</h3>
      {hasPassword ? (
        <PasswordForm />
      ) : (
        <p>{t('underleaf_password_admin_reset_hint')}</p>
      )}
    </>
  )
}

function PasswordForm() {
  const { t } = useTranslation()
  const passwordStrengthOptions = getMeta('ol-passwordStrengthOptions')

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword1, setNewPassword1] = useState('')
  const [newPassword2, setNewPassword2] = useState('')
  const { isLoading, isSuccess, isError, data, error, runAsync } =
    useAsync<PasswordUpdateResult>()
  const [isNewPasswordValid, setIsNewPasswordValid] = useState(false)
  const [isFormValid, setIsFormValid] = useState(false)

  const handleCurrentPasswordChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setCurrentPassword(event.target.value)
  }

  const handleNewPassword1Change = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setNewPassword1(event.target.value)
    setIsNewPasswordValid(event.target.validity.valid)
  }

  const handleNewPassword2Change = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setNewPassword2(event.target.value)
  }

  useEffect(() => {
    setIsFormValid(
      !!currentPassword && isNewPasswordValid && newPassword1 === newPassword2,
    )
  }, [currentPassword, newPassword1, newPassword2, isNewPasswordValid])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isFormValid) {
      return
    }
    runAsync(
      postJSON('/user/password/update', {
        body: {
          currentPassword,
          newPassword1,
          newPassword2,
        },
      }),
    ).catch(() => {})
  }

  return (
    <form id="password-change-form" onSubmit={handleSubmit}>
      <PasswordFormGroup
        id="current-password-input"
        label={t('current_password')}
        value={currentPassword}
        handleChange={handleCurrentPasswordChange}
        autoComplete="current-password"
      />
      <PasswordFormGroup
        id="new-password-1-input"
        label={t('new_password')}
        value={newPassword1}
        handleChange={handleNewPassword1Change}
        minLength={passwordStrengthOptions?.length?.min || 8}
        autoComplete="new-password"
      />
      <PasswordFormGroup
        id="new-password-2-input"
        label={t('confirm_new_password')}
        value={newPassword2}
        handleChange={handleNewPassword2Change}
        validationMessage={
          newPassword1 !== newPassword2 ? t('doesnt_match') : ''
        }
        autoComplete="new-password"
      />
      {isSuccess && data?.message?.text ? (
        <OLFormGroup>
          <div className="notification-list">
            <Notification type="success" content={data.message.text} />
          </div>
        </OLFormGroup>
      ) : null}
      {isError ? (
        <OLFormGroup>
          <div className="notification-list">
            <Notification
              type="error"
              content={getUserFacingMessage(error) ?? ''}
            />
          </div>
        </OLFormGroup>
      ) : null}
      <OLFormGroup>
        <OLButton
          form="password-change-form"
          type="submit"
          variant="primary"
          disabled={isLoading || !isFormValid}
          isLoading={isLoading}
          loadingLabel={`${t('saving')}…`}
        >
          {t('change')}
        </OLButton>
      </OLFormGroup>
    </form>
  )
}

type PasswordFormGroupProps = {
  id: string
  label: string
  value: string
  handleChange: (event: React.ChangeEvent<HTMLInputElement>) => void
  minLength?: number
  validationMessage?: string
  autoComplete?: string
}

function PasswordFormGroup({
  id,
  label,
  value,
  handleChange,
  minLength,
  validationMessage: parentValidationMessage,
  autoComplete,
}: PasswordFormGroupProps) {
  const [validationMessage, setValidationMessage] = useState('')
  const [hadInteraction, setHadInteraction] = useState(false)

  const handleInvalid = (event: React.InvalidEvent<HTMLInputElement>) => {
    event.preventDefault()
  }

  const handleChangeAndValidity = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    handleChange(event)
    setHadInteraction(true)
    setValidationMessage(event.target.validationMessage)
  }

  const isInvalid = Boolean(
    hadInteraction && (parentValidationMessage || validationMessage),
  )

  return (
    <OLFormGroup controlId={id}>
      <OLFormLabel>{label}</OLFormLabel>
      <OLFormControl
        type="password"
        placeholder="*********"
        autoComplete={autoComplete}
        value={value}
        data-ol-dirty={!!validationMessage}
        onChange={handleChangeAndValidity}
        onInvalid={handleInvalid}
        required={hadInteraction}
        minLength={minLength}
        isInvalid={isInvalid}
      />
      {isInvalid && (
        <OLFormText type="error">
          {parentValidationMessage || validationMessage}
        </OLFormText>
      )}
    </OLFormGroup>
  )
}

export default PasswordSection
