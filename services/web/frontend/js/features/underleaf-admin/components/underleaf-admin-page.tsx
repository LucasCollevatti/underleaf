import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import OLButton from '@/shared/components/ol/ol-button'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import type {
  UnderleafAdminPageData,
  UnderleafUserAction,
  UnderleafUserMutationResult,
} from '../../../../../types/underleaf-admin'
import UserActionModal from './user-action-modal'

export default function UnderleafAdminPage({
  data,
}: {
  data: UnderleafAdminPageData
}) {
  return (
    <UnderleafAppProviders>
      <UnderleafAppShell
        activePage={data.page === 'overview' ? 'admin' : 'users'}
      >
        <main id="main-content" className="underleaf-admin-main">
          {data.page === 'overview' ? (
            <Overview stats={data.stats} />
          ) : (
            <Users data={data} />
          )}
        </main>
      </UnderleafAppShell>
    </UnderleafAppProviders>
  )
}

function Overview({
  stats,
}: {
  stats: Extract<UnderleafAdminPageData, { page: 'overview' }>['stats']
}) {
  const { t } = useTranslation()
  const metrics = [
    ['underleaf_users', stats.userCount],
    ['underleaf_active_users', stats.activeUsers],
    ['underleaf_active_administrators', stats.adminUsers],
    ['underleaf_active_projects', stats.projectCount],
  ] as const
  return (
    <>
      <header className="underleaf-admin-heading">
        <div>
          <h1>{t('underleaf_administration')}</h1>
          <p>{t('underleaf_admin_intro')}</p>
        </div>
      </header>
      <section aria-labelledby="underleaf-overview-heading">
        <h2 id="underleaf-overview-heading">{t('underleaf_overview')}</h2>
        <dl className="underleaf-admin-stats">
          {metrics.map(([key, value]) => (
            <div key={key}>
              <dt>{t(key)}</dt>
              <dd>{value.toLocaleString()}</dd>
            </div>
          ))}
        </dl>
      </section>
      <section
        className="underleaf-admin-panel"
        aria-labelledby="underleaf-user-management-heading"
      >
        <h2 id="underleaf-user-management-heading">
          {t('underleaf_user_management')}
        </h2>
        <p>{t('underleaf_user_management_intro')}</p>
        <div className="d-flex flex-wrap gap-2">
          <OLButton href="/admin/users">{t('underleaf_manage_users')}</OLButton>
          <OLButton href="/status" variant="secondary">
            {t('underleaf_application_status')}
          </OLButton>
        </div>
      </section>
    </>
  )
}

function Users({
  data,
}: {
  data: Extract<UnderleafAdminPageData, { page: 'users' }>
}) {
  const { t, i18n } = useTranslation()
  const [users, setUsers] = useState(data.users)
  const [query, setQuery] = useState('')
  const [action, setAction] = useState<UnderleafUserAction | null>(null)
  const [notice, setNotice] = useState(data.notice)
  const [error, setError] = useState(data.error)
  const search = query.trim().toLocaleLowerCase()
  const visible = users.filter(user =>
    `${user.username} ${user.displayName}`.toLocaleLowerCase().includes(search)
  )

  function completed(result: UnderleafUserMutationResult) {
    if (result.user) {
      const updated = result.user
      setUsers(previous =>
        [...previous.filter(user => user.id !== updated.id), updated].sort(
          (a, b) => a.username.localeCompare(b.username)
        )
      )
    } else if (result.id) {
      setUsers(previous => previous.filter(user => user.id !== result.id))
    }
    setNotice(result.message)
    setError('')
    setAction(null)
  }

  function date(value: string | null) {
    if (!value) return t('underleaf_never')
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime())
      ? '—'
      : parsed.toLocaleString(i18n.language)
  }

  return (
    <>
      <header className="underleaf-admin-heading">
        <div>
          <h1>{t('underleaf_users')}</h1>
          <p>{t('underleaf_users_intro')}</p>
        </div>
        <OLButton
          leadingIcon="person_add"
          onClick={() => setAction({ kind: 'create' })}
        >
          {t('underleaf_create_user')}
        </OLButton>
      </header>
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      <div className="underleaf-admin-search">
        <OLFormLabel htmlFor="underleaf-user-search">
          {t('underleaf_search_users')}
        </OLFormLabel>
        <OLFormControl
          id="underleaf-user-search"
          type="search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <p className="mt-2 mb-0" role="status">
          {t('underleaf_users_count', {
            count: visible.length,
            total: users.length,
          })}
        </p>
      </div>
      <div className="underleaf-admin-panel underleaf-admin-table-wrapper">
        <table className="table align-middle underleaf-admin-table">
          <caption className="visually-hidden">
            {t('underleaf_users_table_caption')}
          </caption>
          <thead>
            <tr>
              {[
                'underleaf_username',
                'underleaf_display_name',
                'underleaf_role',
                'underleaf_status',
                'projects',
                'underleaf_last_login',
                'actions',
              ].map(key => (
                <th scope="col" key={key}>
                  {t(key)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map(user => {
              const ownAccount = user.id === data.currentUserId
              const button = (
                kind: 'edit' | 'password' | 'status' | 'delete',
                label: string,
                disabled = false
              ) => (
                <OLButton
                  key={kind}
                  size="sm"
                  variant={kind === 'delete' ? 'danger-ghost' : 'secondary'}
                  aria-label={`${label}: ${user.username}`}
                  disabled={disabled}
                  onClick={() => setAction({ kind, user })}
                >
                  {label}
                </OLButton>
              )
              return (
                <tr key={user.id}>
                  <th scope="row">
                    <span>{user.username}</span>
                    {ownAccount && (
                      <span className="underleaf-admin-you">
                        {t('underleaf_you')}
                      </span>
                    )}
                  </th>
                  <td>{user.displayName}</td>
                  <td>
                    {t(
                      user.role === 'admin'
                        ? 'underleaf_administrator'
                        : 'underleaf_user_role'
                    )}
                  </td>
                  <td>
                    <span
                      className={`underleaf-admin-status underleaf-admin-status-${user.status}`}
                    >
                      {t(
                        user.status === 'active'
                          ? 'underleaf_active'
                          : 'underleaf_disabled'
                      )}
                    </span>
                  </td>
                  <td>{user.projectCount}</td>
                  <td>{date(user.lastLoginAt)}</td>
                  <td>
                    <div className="underleaf-admin-actions">
                      {button('edit', t('underleaf_edit_user'))}
                      {button('password', t('underleaf_reset_password'))}
                      {button(
                        'status',
                        t(
                          user.status === 'active'
                            ? 'underleaf_disable_user'
                            : 'underleaf_enable_user'
                        ),
                        ownAccount
                      )}
                      {button('delete', t('underleaf_delete_user'), ownAccount)}
                    </div>
                  </td>
                </tr>
              )
            })}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center p-4">
                  {t(
                    search
                      ? 'underleaf_no_matching_users'
                      : 'underleaf_no_users'
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {action && (
        <UserActionModal
          action={action}
          currentUserId={data.currentUserId}
          onHide={() => setAction(null)}
          onSuccess={completed}
        />
      )}
    </>
  )
}
