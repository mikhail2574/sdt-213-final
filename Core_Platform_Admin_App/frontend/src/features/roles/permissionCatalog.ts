import type { RoleCode } from '../../types/api'

/** What each backend permission code allows, in the order shown in the matrix. */
export const PERMISSION_LABELS: Record<string, string> = {
  'dashboard.view': 'View the dashboard and system status',
  'users.view': 'View users and roles',
  'users.create': 'Create and invite users',
  'users.edit': 'Edit, activate and deactivate users',
  'roles.manage': 'Assign roles and edit permissions',
  'settings.manage': 'Manage system settings',
  'audit.view': 'View the activity log',
  'reports.view': 'View and export reports',
  'announcements.send': 'Send announcements',
  'directory.view': 'Search the directory',
  'messages.send': 'Send messages',
  'modules.lms': 'Open LMS Core',
  'modules.sis': 'Open SIS',
  'modules.scheduling': 'Open Academic Scheduling',
  'modules.admissions': 'Open Admissions',
}

export const ROLE_DESCRIPTIONS: Record<RoleCode, string> = {
  Administrator: 'Full access to the Admin Console.',
  Operator: 'Staff who manage user accounts.',
  Viewer: 'Staff with read-only console access.',
  Faculty: 'Teaching staff.',
  Staff: 'University employees.',
  Student: 'Enrolled students.',
  Applicant: 'Prospective students.',
}

/** Known codes first, in the order above, then anything new the server reports. */
export function orderedPermissions(codes: string[]): string[] {
  const known = Object.keys(PERMISSION_LABELS).filter(code => codes.includes(code))
  return [...known, ...codes.filter(code => !(code in PERMISSION_LABELS)).sort()]
}
