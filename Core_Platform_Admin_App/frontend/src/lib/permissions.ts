/**
 * Permission codes defined by the backend (AccessService.CODES, table role_permissions).
 * GET /me returns the user's codes in `permissions`; the server checks them again on every
 * request (NFR3), the UI only hides what is not allowed (FR7).
 */
export const PERMISSIONS = {
  DASHBOARD_VIEW: 'dashboard.view',
  USERS_VIEW: 'users.view',
  USERS_CREATE: 'users.create',
  USERS_EDIT: 'users.edit',
  ROLES_MANAGE: 'roles.manage',
  DIRECTORY_VIEW: 'directory.view',
  MESSAGES_SEND: 'messages.send',
  ANNOUNCEMENTS_SEND: 'announcements.send',
  REPORTS_VIEW: 'reports.view',
  SETTINGS_MANAGE: 'settings.manage',
  AUDIT_VIEW: 'audit.view',
} as const

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS]

const P = PERMISSIONS

/** Admin Console pages: having any of these means the user has console access. */
export const CONSOLE_PERMISSIONS: Permission[] = [P.DASHBOARD_VIEW, P.USERS_VIEW, P.ROLES_MANAGE, P.SETTINGS_MANAGE, P.AUDIT_VIEW]
