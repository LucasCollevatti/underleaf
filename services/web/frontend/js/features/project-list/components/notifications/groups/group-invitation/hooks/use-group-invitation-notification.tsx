import {
  useState,
  useCallback,
} from 'react'
import type { NotificationGroupInvitation } from '../../../../../../../../../types/project/dashboard/notification'
import useAsync from '../../../../../../../shared/hooks/use-async'
import { FetchError, getJSON, putJSON } from '../../../../../../../infrastructure/fetch-json'
import { useLocation } from '../../../../../../../shared/hooks/use-location'
import useAsyncDismiss from '../../../hooks/useAsyncDismiss'
import { debugConsole } from '@/utils/debugging'
import getMeta from '@/utils/meta'

const SUCCESSFUL_NOTIF_TIME_BEFORE_HIDDEN = 10 * 1000

/* eslint-disable no-unused-vars */
export enum GroupInvitationStatus {
  AskToJoin = 'AskToJoin',
  SuccessfullyJoined = 'SuccessfullyJoined',
  NotificationIsHidden = 'NotificationIsHidden',
  Error = 'Error',
}
/* eslint-enable no-unused-vars */

type UseGroupInvitationNotificationReturnType = {
  isAcceptingInvitation: boolean
  groupInvitationStatus: GroupInvitationStatus
  acceptGroupInvite: () => void
  dismissGroupInviteNotification: () => void
  hideNotification: () => void
}

export function useGroupInvitationNotification(
  notification: NotificationGroupInvitation
): UseGroupInvitationNotificationReturnType {
  const { _id: notificationId } = notification
  const [groupInvitationStatus, setGroupInvitationStatus] =
    useState<GroupInvitationStatus>(GroupInvitationStatus.AskToJoin)
  const { runAsync, isLoading } = useAsync<void, FetchError>()
  const { runAsync: runAsyncNotification, isLoading: isLoadingNotification } =
    useAsync<NotificationGroupInvitation, FetchError>()
  const location = useLocation()
  const { handleDismiss } = useAsyncDismiss()

  const acceptGroupInvite = useCallback(() => {
    // Fetch the latest notification data to ensure it's up-to-date
    runAsyncNotification(getJSON(`/user/notification/${notificationId}`))
      .then(notification => {
        const {
          messageOpts: { token, managedUsersEnabled },
        } = notification
        if (managedUsersEnabled) {
          location.assign(`/subscription/invites/${token}/`)
        } else {
          runAsync(
            putJSON(`/subscription/invites/${token}/`, {
              body: {
                _csrf: getMeta('ol-csrfToken'),
              },
            })
          )
            .then(() => {
              setGroupInvitationStatus(GroupInvitationStatus.SuccessfullyJoined)
            })
            .catch(err => {
              debugConsole.error(err)
              setGroupInvitationStatus(GroupInvitationStatus.Error)
            })
            .finally(() => {
              // remove notification automatically in the browser
              window.setTimeout(() => {
                setGroupInvitationStatus(
                  GroupInvitationStatus.NotificationIsHidden
                )
              }, SUCCESSFUL_NOTIF_TIME_BEFORE_HIDDEN)
            })
        }
      })
      .catch(debugConsole.error)
  }, [runAsync, runAsyncNotification, notificationId, location])

  const dismissGroupInviteNotification = useCallback(() => {
    if (notificationId) {
      handleDismiss(notificationId)
    }
  }, [handleDismiss, notificationId])

  const hideNotification = useCallback(() => {
    setGroupInvitationStatus(GroupInvitationStatus.NotificationIsHidden)
  }, [])

  const isAcceptingInvitation = isLoadingNotification || isLoading

  return {
    isAcceptingInvitation,
    groupInvitationStatus,
    acceptGroupInvite,
    dismissGroupInviteNotification,
    hideNotification,
  }
}
