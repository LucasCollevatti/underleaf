import classNames from 'classnames'

export type UnderleafPageSkeletonVariant =
  | 'projects'
  | 'settings'
  | 'admin'
  | 'users'
  | 'sessions'
  | 'system'

const PROJECT_ROW_COUNT = 6
const SETTINGS_CARD_COUNT = 4
const ADMIN_TABLE_ROW_COUNT = 5
const SYSTEM_SERVICE_COUNT = 4

function SkeletonBlock({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={classNames('underleaf-skeleton-block', className)}
    />
  )
}

function SkeletonRows({
  count,
  className,
}: {
  count: number
  className?: string
}) {
  return Array.from({ length: count }, (_, index) => (
    <div
      key={index}
      aria-hidden="true"
      className={classNames('underleaf-skeleton-row', className)}
    >
      <SkeletonBlock className="underleaf-skeleton-row-dot" />
      <SkeletonBlock className="underleaf-skeleton-row-line" />
      <SkeletonBlock className="underleaf-skeleton-row-line-short" />
    </div>
  ))
}

function ProjectsSkeleton() {
  return (
    <>
      <div className="underleaf-skeleton-page-heading">
        <SkeletonBlock className="underleaf-skeleton-title" />
        <SkeletonBlock className="underleaf-skeleton-action" />
      </div>
      <SkeletonBlock className="underleaf-skeleton-search" />
      <div className="underleaf-skeleton-project-table">
        <div className="underleaf-skeleton-table-heading" aria-hidden="true">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonRows count={PROJECT_ROW_COUNT} />
      </div>
    </>
  )
}

function SettingsSkeleton() {
  return (
    <>
      <SkeletonBlock className="underleaf-skeleton-page-title" />
      <div className="underleaf-skeleton-card-grid">
        {Array.from({ length: SETTINGS_CARD_COUNT }, (_, index) => (
          <div key={index} className="underleaf-skeleton-card">
            <SkeletonBlock className="underleaf-skeleton-card-title" />
            <SkeletonBlock className="underleaf-skeleton-card-line" />
            <SkeletonBlock className="underleaf-skeleton-card-line-short" />
            <SkeletonBlock className="underleaf-skeleton-card-control" />
          </div>
        ))}
      </div>
    </>
  )
}

function AdminSkeleton() {
  return (
    <>
      <div className="underleaf-skeleton-page-heading underleaf-skeleton-admin-heading">
        <div>
          <SkeletonBlock className="underleaf-skeleton-title" />
          <SkeletonBlock className="underleaf-skeleton-description" />
        </div>
        <SkeletonBlock className="underleaf-skeleton-action" />
      </div>
      <div className="underleaf-skeleton-stat-grid">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="underleaf-skeleton-stat">
            <SkeletonBlock className="underleaf-skeleton-card-line-short" />
            <SkeletonBlock className="underleaf-skeleton-stat-value" />
          </div>
        ))}
      </div>
      <div className="underleaf-skeleton-admin-panel">
        <SkeletonBlock className="underleaf-skeleton-card-title" />
        <SkeletonBlock className="underleaf-skeleton-description" />
        <SkeletonRows count={ADMIN_TABLE_ROW_COUNT} />
      </div>
    </>
  )
}

function UsersSkeleton() {
  return (
    <>
      <div className="underleaf-skeleton-page-heading underleaf-skeleton-admin-heading">
        <div>
          <SkeletonBlock className="underleaf-skeleton-title" />
          <SkeletonBlock className="underleaf-skeleton-description" />
        </div>
        <SkeletonBlock className="underleaf-skeleton-action" />
      </div>
      <SkeletonBlock className="underleaf-skeleton-admin-search" />
      <div className="underleaf-skeleton-admin-panel">
        <div className="underleaf-skeleton-table-heading" aria-hidden="true">
          <SkeletonBlock />
          <SkeletonBlock />
          <SkeletonBlock />
        </div>
        <SkeletonRows count={ADMIN_TABLE_ROW_COUNT} />
      </div>
    </>
  )
}

function SessionsSkeleton() {
  return (
    <>
      <div className="underleaf-skeleton-breadcrumb">
        <SkeletonBlock className="underleaf-skeleton-breadcrumb-item" />
        <SkeletonBlock className="underleaf-skeleton-breadcrumb-separator" />
        <SkeletonBlock className="underleaf-skeleton-breadcrumb-item-short" />
      </div>
      <div className="underleaf-skeleton-session-heading">
        <SkeletonBlock className="underleaf-skeleton-page-title" />
        <SkeletonBlock className="underleaf-skeleton-description" />
      </div>
      <div className="underleaf-skeleton-session-card">
        <SkeletonBlock className="underleaf-skeleton-card-heading" />
        <div className="underleaf-skeleton-session-row">
          <SkeletonBlock className="underleaf-skeleton-session-icon" />
          <div>
            <SkeletonBlock className="underleaf-skeleton-session-label" />
            <SkeletonBlock className="underleaf-skeleton-session-value" />
          </div>
          <div>
            <SkeletonBlock className="underleaf-skeleton-session-label" />
            <SkeletonBlock className="underleaf-skeleton-session-value-wide" />
          </div>
          <SkeletonBlock className="underleaf-skeleton-session-badge" />
        </div>
      </div>
      <div className="underleaf-skeleton-session-card underleaf-skeleton-session-card-empty">
        <div className="underleaf-skeleton-session-card-header">
          <SkeletonBlock className="underleaf-skeleton-card-heading" />
          <SkeletonBlock className="underleaf-skeleton-action-secondary" />
        </div>
        <div className="underleaf-skeleton-session-empty">
          <SkeletonBlock className="underleaf-skeleton-session-empty-icon" />
          <SkeletonBlock className="underleaf-skeleton-session-empty-title" />
          <SkeletonBlock className="underleaf-skeleton-session-empty-line" />
        </div>
      </div>
    </>
  )
}

function SystemSkeleton() {
  return (
    <div className="underleaf-skeleton-system-content">
      <div className="underleaf-skeleton-page-heading underleaf-skeleton-system-heading">
        <div>
          <SkeletonBlock className="underleaf-skeleton-page-title" />
          <SkeletonBlock className="underleaf-skeleton-description" />
        </div>
        <SkeletonBlock className="underleaf-skeleton-action-secondary" />
      </div>
      <SkeletonBlock className="underleaf-skeleton-system-summary" />
      <div className="underleaf-skeleton-system-services">
        {Array.from({ length: SYSTEM_SERVICE_COUNT }, (_, index) => (
          <div className="underleaf-skeleton-system-service" key={index}>
            <SkeletonBlock className="underleaf-skeleton-system-icon" />
            <div>
              <SkeletonBlock className="underleaf-skeleton-system-service-title" />
              <SkeletonBlock className="underleaf-skeleton-system-service-description" />
            </div>
            <SkeletonBlock className="underleaf-skeleton-system-status" />
          </div>
        ))}
      </div>
      <div className="underleaf-skeleton-system-note">
        <SkeletonBlock className="underleaf-skeleton-system-note-icon" />
        <div>
          <SkeletonBlock className="underleaf-skeleton-system-note-line" />
          <SkeletonBlock className="underleaf-skeleton-system-note-line-short" />
        </div>
      </div>
    </div>
  )
}

export default function UnderleafPageSkeleton({
  variant,
}: {
  variant: UnderleafPageSkeletonVariant
}) {
  const content = {
    projects: <ProjectsSkeleton />,
    settings: <SettingsSkeleton />,
    admin: <AdminSkeleton />,
    users: <UsersSkeleton />,
    sessions: <SessionsSkeleton />,
    system: <SystemSkeleton />,
  }[variant]

  return (
    <div
      aria-label="Loading"
      aria-live="polite"
      className={classNames(
        'underleaf-page-skeleton',
        `underleaf-page-skeleton-${variant}`
      )}
      role="status"
    >
      <span className="visually-hidden">Loading</span>
      {content}
    </div>
  )
}
