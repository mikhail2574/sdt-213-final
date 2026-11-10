import type { Me } from '../types/api'

/** Administrators land on the Admin Console dashboard, everyone else on the portal home page. */
export function startPath(user: Me): string {
  return user.role === 'Administrator' ? '/admin/dashboard' : '/home'
}
