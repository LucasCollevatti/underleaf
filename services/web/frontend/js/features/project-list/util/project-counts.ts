import type { Project } from '../../../../../types/project/dashboard/api'

export type ProjectFilterCounts = {
  all: number
  owned: number
  shared: number
  archived: number
  trashed: number
}

export function getProjectFilterCounts(
  projects: Pick<Project, 'accessLevel' | 'archived' | 'trashed'>[]
): ProjectFilterCounts {
  const activeProjects = projects.filter(
    project => !project.archived && !project.trashed
  )

  return {
    all: activeProjects.length,
    owned: activeProjects.filter(project => project.accessLevel === 'owner')
      .length,
    shared: activeProjects.filter(project => project.accessLevel !== 'owner')
      .length,
    archived: projects.filter(project => project.archived && !project.trashed)
      .length,
    trashed: projects.filter(project => project.trashed).length,
  }
}
