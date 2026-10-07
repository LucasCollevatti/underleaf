import classNames from 'classnames'

export type UnderleafPageSkeletonVariant =
  | 'projects'
  | 'settings'
  | 'admin'
  | 'users'

const PROJECT_ROW_COUNT = 6
const SETTINGS_CARD_COUNT = 4
const ADMIN_TABLE_ROW_COUNT = 5

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
