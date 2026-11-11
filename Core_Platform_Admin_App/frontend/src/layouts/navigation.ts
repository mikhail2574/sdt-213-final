import { PERMISSIONS as P, type Permission } from '../lib/permissions'

export interface NavItem {
  to: string
  label: string
  /** Page title shown above the content when it differs from the label. */
  title?: string
  /** Hidden unless the user has this permission, or one of these permissions (FR7). */
  permission?: Permission | Permission[]
}

export const PORTAL_NAV: NavItem[] = [
  { to: '/home', label: 'Home' },
  { to: '/notifications', label: 'Notifications' },
  { to: '/messages', label: 'Messages', permission: P.MESSAGES_SEND },
  { to: '/directory', label: 'Directory', permission: [P.DIRECTORY_VIEW, P.USERS_VIEW] },
  { to: '/announcements', label: 'Announcements', permission: P.ANNOUNCEMENTS_SEND },
  { to: '/reports', label: 'Reports', permission: P.REPORTS_VIEW },
  { to: '/profile', label: 'Profile' },
]

export const CONSOLE_NAV: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', permission: P.DASHBOARD_VIEW },
  { to: '/admin/users', label: 'Users', permission: P.USERS_VIEW },
  { to: '/admin/roles', label: 'Roles & access', permission: P.USERS_VIEW },
  { to: '/admin/settings', label: 'Settings', permission: P.SETTINGS_MANAGE },
  { to: '/admin/status', label: 'System status', permission: P.DASHBOARD_VIEW },
  { to: '/admin/audit', label: 'Activity log', permission: P.AUDIT_VIEW },
]

export function findNavItem(pathname: string): NavItem | undefined {
  return [...PORTAL_NAV, ...CONSOLE_NAV].find(item => pathname === item.to || pathname.startsWith(`${item.to}/`))
}
