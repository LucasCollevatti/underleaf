import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  UnderleafAppProviders,
  UnderleafAppShell,
} from '@/shared/components/underleaf/underleaf-app-shell'
import OLButton from '@/shared/components/ol/ol-button'
import OLFormControl from '@/shared/components/ol/ol-form-control'
import OLFormLabel from '@/shared/components/ol/ol-form-label'
import MaterialIcon from '@/shared/components/material-icon'
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
    {
      label: t('underleaf_users', { defaultValue: 'Users' }),
      value: stats.userCount,
      description: 'All accounts',
      icon: 'group',
    },
    {
      label: t('underleaf_active_users', { defaultValue: 'Active users' }),
      value: stats.activeUsers,
      description: 'Signed in last 30 days',
      icon: 'person_check',
    },
    {
      label: 'Administrators',
      value: stats.adminUsers,
      description: 'Full access',
      icon: 'shield',
    },
    {
      label: t('underleaf_active_projects', { defaultValue: 'Active projects' }),
      value: stats.projectCount,
      description: 'Excluding trash',
      icon: 'description',
    },
  ]

  return (
    <>
      <header className="underleaf-admin-heading">
        <div>
          <h1>{t('underleaf_administration')}</h1>
          <p>
            {t('underleaf_admin_overview_intro', {
              defaultValue: 'Overview of this Underleaf instance.',
            })}
          </p>
        </div>
      </header>
      <section className="underleaf-admin-stats" aria-label="Overview">
        {metrics.map(metric => (
          <div className="underleaf-admin-stat-card" key={metric.label}>
            <div className="underleaf-admin-stat-header">
              <span>{metric.label}</span>
              <MaterialIcon type={metric.icon} />
            </div>
            <strong>{metric.value.toLocaleString()}</strong>
            <small>{metric.description}</small>
          </div>
        ))}
      </section>
      <section className="underleaf-admin-overview-grid" aria-label="Administration links">
        <a className="underleaf-admin-action-card" href="/admin/users">
          <span className="underleaf-admin-action-icon" aria-hidden="true">
            <MaterialIcon type="group" />
          </span>
          <h2>{t('underleaf_users', { defaultValue: 'Users' })}</h2>
          <p>Create accounts, reset passwords and manage roles.</p>
          <span className="underleaf-admin-action-link">
            {t('underleaf_manage_users', { defaultValue: 'Manage users' })} →
          </span>
        </a>
        <a className="underleaf-admin-action-card" href="/status">
          <span className="underleaf-admin-action-icon" aria-hidden="true">
            <MaterialIcon type="monitor_heart" />
          </span>
          <h2>
            {t('underleaf_system_status_title', {
              defaultValue: 'System status',
            })}
          </h2>
          <p>Check the web process, site access and editor.</p>
          <span className="underleaf-admin-action-link">
            View status →
          </span>
        </a>
        <section className="underleaf-admin-instance-card" aria-labelledby="instance-heading">
          <h2 id="instance-heading">Instance</h2>
          <dl>
            <div>
              <dt>Version</dt>
              <dd>1.0.0</dd>
            </div>
            <div>
              <dt>URL</dt>
              <dd>{window.location.host}</dd>
            </div>
            <div>
              <dt>Registration</dt>
              <dd>Invite only</dd>
            </div>
            <div>
              <dt>TeX</dt>
              <dd>TeX Live 2026</dd>
            </div>
          </dl>
        </section>
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
