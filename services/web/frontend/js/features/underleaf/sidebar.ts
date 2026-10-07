import { postJSON } from '@/infrastructure/fetch-json'
import { debugConsole } from '@/utils/debugging'
import type { GetProjectsResponseBody } from '../../../../types/project/dashboard/api'
import { getProjectFilterCounts } from '@/features/project-list/util/project-counts'

function setupAccountMenu(sidebar: HTMLElement) {
  const account = sidebar.querySelector<HTMLElement>('.underleaf-sidebar-account')
  const trigger = account?.querySelector<HTMLButtonElement>(
    '.underleaf-sidebar-account-trigger'
  )
  const menu = account?.querySelector<HTMLElement>(
    '.underleaf-sidebar-account-menu'
  )

  if (!account || !trigger || !menu) return

  const closeMenu = () => {
    menu.hidden = true
    trigger.setAttribute('aria-expanded', 'false')
  }

  trigger.addEventListener('click', () => {
    const isOpen = menu.hidden
    menu.hidden = !isOpen
    trigger.setAttribute('aria-expanded', String(isOpen))
  })

  document.addEventListener('mousedown', event => {
    if (!account.contains(event.target as Node)) closeMenu()
  })
}

function loadProjectCounts(sidebar: HTMLElement) {
  if (
    !sidebar.querySelector(
      '.underleaf-sidebar-project-navigation.is-expanded'
    )
  )
    return

  const countElements = Array.from(
    sidebar.querySelectorAll<HTMLElement>('[data-project-count]')
  )
  if (countElements.length === 0) return

  postJSON<GetProjectsResponseBody>('/api/project', {
    body: { sort: { by: 'lastUpdated', order: 'desc' } },
  })
    .then(data => {
      const counts = getProjectFilterCounts(data.projects)
      for (const element of countElements) {
        const filter = element.dataset.projectCount as keyof typeof counts
        element.textContent = String(counts[filter])
      }
    })
    .catch(error => {
      debugConsole.error(error)
    })
}

function setupStaticSidebar() {
  const sidebar = document.querySelector<HTMLElement>(
    '.underleaf-static-shell .underleaf-sidebar'
  )
  if (!sidebar) return

  setupAccountMenu(sidebar)
  loadProjectCounts(sidebar)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setupStaticSidebar, { once: true })
} else {
  setupStaticSidebar()
}
