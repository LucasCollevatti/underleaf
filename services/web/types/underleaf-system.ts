export type UnderleafSystemPageData = {
  kind: 'error' | 'session-expired' | 'maintenance' | 'logout' | 'status'
  title: string
  description: string
  descriptionHtml?: string
  detail?: string
  code?: number
  signedIn: boolean
  canAdmin: boolean
  backPath: string
  backLabel: string
  status?: {
    checkedAt: string
    uptimeSeconds: number
    shuttingDown: boolean
    siteOpen: boolean
    editorOpen: boolean
  }
}
