import type { Me } from '../types/api'

/** Administrators who may see the dashboard land on it; everyone else lands on the portal home page. */
export function startPath(user: Me): string {
  return user.role === 'Administrator' && user.permissions.includes('dashboard.view') ? '/admin/dashboard' : '/home'
}
