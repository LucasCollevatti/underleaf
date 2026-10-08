export type UnderleafAdminUser = {
  id: string
  username: string
  displayName: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled'
  projectCount: number
  createdAt: string | null
  lastLoginAt: string | null
}

export type UnderleafRuntimeInfo = {
  releaseVersion: string
  texLiveVersion: string | null
  texLiveSource: string
}

export type UnderleafAdminPageData =
  | {
      page: 'overview'
      stats: {
        userCount: number
        activeUsers: number
        adminUsers: number
        projectCount: number
      }
      runtime: UnderleafRuntimeInfo
    }
  | {
      page: 'users'
      users: UnderleafAdminUser[]
      currentUserId: string
      notice: string
      error: string
    }

export type UnderleafUserAction =
  | { kind: 'create' }
  | {
      kind: 'edit' | 'password' | 'status' | 'delete'
      user: UnderleafAdminUser
    }

export type UnderleafUserMutationResult = {
  user?: UnderleafAdminUser
  id?: string
  cancelled?: boolean
  message: string
}
