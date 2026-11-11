import type { RoleCode } from '../../types/api'

const CONSOLE_ROLES: RoleCode[] = ['Administrator', 'Operator', 'Viewer']
const ADMIN_ONLY = ['roles.manage', 'settings.manage', 'audit.view']
const ADMIN_REQUIRED = ['roles.manage', 'settings.manage', 'users.view', 'users.edit']
const CONSOLE_ONLY = ['users.view', 'users.edit', 'users.create', 'dashboard.view']
const VIEWER_FORBIDDEN = ['users.edit', 'users.create', 'announcements.send']

/**
 * Permissions the server would reject or requires (SettingsService): returns the fixed value,
 * or null when the administrator may change it.
 */
export function fixedPermission(role: RoleCode, code: string): boolean | null {
  if (role === 'Administrator') return ADMIN_REQUIRED.includes(code) ? true : null
  if (ADMIN_ONLY.includes(code)) return false
  if (!CONSOLE_ROLES.includes(role) && CONSOLE_ONLY.includes(code)) return false
  if (role === 'Viewer' && VIEWER_FORBIDDEN.includes(code)) return false
  return null
}
