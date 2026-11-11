import type { Me } from '../types/api'

/**
 * Permission codes used by the UI. GET /me returns the authoritative list in `permissions`;
 * the server checks them again on every request (NFR3), the UI only hides what is not allowed (FR7).
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  USERS_RESET_PASSWORD: 'users.edit',
  ROLES_ASSIGN: 'roles.manage',
  ROLES_VIEW: 'users.view',
  ROLES_EDIT: 'roles.manage',
  DIRECTORY_VIEW: 'directory.view',
  ANNOUNCEMENTS_SEND: 'announcements.send',
  REPORTS_VIEW: 'reports.view',
  SETTINGS_MANAGE: 'settings.manage',
  STATUS_VIEW: 'dashboard.view',
  MESSAGES_SEND: 'messages.send',
  AUDIT_VIEW: 'audit.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const P = PERMISSIONS

/** Admin Console pages: having any of these means the user has console access. */
export const CONSOLE_PERMISSIONS: Permission[] = [
  P.DASHBOARD_VIEW,
  P.USERS_VIEW,
  P.ROLES_VIEW,
  P.SETTINGS_MANAGE,
  P.STATUS_VIEW,
  P.AUDIT_VIEW,
]

/** Used only while the backend does not send `permissions` in /me yet. */
const FALLBACK_BY_ROLE: Record<string, Permission[]> = {
  Administrator: Object.values(P),
  Faculty: [P.DIRECTORY_VIEW, P.REPORTS_VIEW],
  Staff: [P.DIRECTORY_VIEW, P.ANNOUNCEMENTS_SEND],
  Student: [P.DIRECTORY_VIEW],
  Applicant: [],
}

const FALLBACK_BY_CONSOLE_ACCESS: Record<string, Permission[]> = {
  Operator: [P.USERS_VIEW, P.USERS_EDIT, P.USERS_RESET_PASSWORD, P.STATUS_VIEW],
  Viewer: [P.DASHBOARD_VIEW, P.USERS_VIEW, P.STATUS_VIEW, P.REPORTS_VIEW],
}

export function resolvePermissions(user: Me | null): Set<string> {
  if (!user) return new Set()
  if (Array.isArray(user.permissions)) return new Set(user.permissions)
  return new Set([
    ...(FALLBACK_BY_ROLE[user.role] ?? []),
    ...(user.console_access ? FALLBACK_BY_CONSOLE_ACCESS[user.console_access] ?? [] : []),
  ])
}
