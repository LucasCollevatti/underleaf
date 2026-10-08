import type { NotificationGroupInvitation } from '../../../../../../../../types/project/dashboard/notification'
import GroupInvitationNotificationJoin from './group-invitation-join'
import GroupInvitationSuccessfulNotification from './group-invitation-successful'
import {
  GroupInvitationStatus,
  useGroupInvitationNotification,
} from './hooks/use-group-invitation-notification'

type GroupInvitationNotificationProps = {
  notification: NotificationGroupInvitation
}

export default function GroupInvitationNotification({
  notification,
}: GroupInvitationNotificationProps) {
  const {
    isAcceptingInvitation,
    groupInvitationStatus,
    acceptGroupInvite,
    dismissGroupInviteNotification,
    hideNotification,
  } = useGroupInvitationNotification(notification)

  switch (groupInvitationStatus) {
    case GroupInvitationStatus.AskToJoin:
      return (
        <GroupInvitationNotificationJoin
          isAcceptingInvitation={isAcceptingInvitation}
          notification={notification}
          acceptGroupInvite={acceptGroupInvite}
          dismissGroupInviteNotification={dismissGroupInviteNotification}
        />
      )
    case GroupInvitationStatus.SuccessfullyJoined:
      return (
        <GroupInvitationSuccessfulNotification
          hideNotification={hideNotification}
        />
      )
    default:
      return null
  }
}
