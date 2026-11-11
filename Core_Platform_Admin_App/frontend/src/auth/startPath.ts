import type { Me } from '../types/api'
import { resolvePermissions } from '../lib/permissions'

/** Administrators land on the Admin Console dashboard, everyone else on the portal home page. */
export function startPath(user: Me): string {
  return user.role === 'Administrator' && resolvePermissions(user).has('dashboard.view') ? '/admin/dashboard' : '/home'
}
