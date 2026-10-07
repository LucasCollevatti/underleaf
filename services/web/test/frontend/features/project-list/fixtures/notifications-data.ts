import { DeepReadonly } from '../../../../../types/utils'
import {
  Institution,
  NotificationDropboxDuplicateProjectNames,
  NotificationGroupInvitation,
  NotificationIPMatchedAffiliation,
} from '../../../../../types/project/dashboard/notification'

export const notificationsInstitution = {
  email: 'email@example.com',
  institutionEmail: 'institution@example.com',
  institutionId: 123,
  institutionName: 'Abc Institution',
  requestedEmail: 'requested@example.com',
} as DeepReadonly<Institution>


export const notificationIPMatchedAffiliation = {
  messageOpts: {
    university_name: 'Abc University',
    ssoEnabled: false,
    institutionId: '456',
  },
} as DeepReadonly<NotificationIPMatchedAffiliation>


export const notificationDropboxDuplicateProjectNames = {
  messageOpts: {
    projectName: 'Abc Project',
  },
} as DeepReadonly<NotificationDropboxDuplicateProjectNames>

export const notificationGroupInviteDefault = {
  messageOpts: {
    token: '123abc',
    inviterName: 'inviter@overleaf.com',
    managedUsersEnabled: false,
  },
} as DeepReadonly<NotificationGroupInvitation>

export const notificationGroupInviteManagedUsers = {
  messageOpts: {
    token: '123abc',
    inviterName: 'inviter@overleaf.com',
    managedUsersEnabled: true,
  },
} as DeepReadonly<NotificationGroupInvitation>
