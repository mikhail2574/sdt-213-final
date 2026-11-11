import type { AccountStatus, Channel, ConsoleAccess, Role } from '../types/api'
import type { Tone } from '../components/ui/Badge'

export const ROLES: Role[] = ['Administrator', 'Faculty', 'Staff', 'Student', 'Applicant']
export const STATUSES: AccountStatus[] = ['Active', 'Pending', 'Inactive']
export const CONSOLE_ACCESS: ConsoleAccess[] = ['Operator', 'Viewer']

export const STATUS_TONES: Record<AccountStatus, Tone> = { Active: 'blue', Pending: 'lilac', Inactive: 'neutral' }

export const NOTIFICATION_CATEGORIES = [
  { code: 'grades', label: 'Grades and assignments' },
  { code: 'deadlines', label: 'Deadlines' },
  { code: 'timetable', label: 'Timetable changes' },
  { code: 'messages', label: 'Messages' },
  { code: 'announcements', label: 'Announcements' },
] as const

export const ANNOUNCEMENT_CATEGORY = 'announcements'

export const CHANNELS: { value: Channel; label: string }[] = [
  { value: 'both', label: 'In-app + email' },
  { value: 'in_app', label: 'In-app only' },
  { value: 'email', label: 'Email only' },
]

export const DEMO_ACCOUNTS = [
  { label: 'Admin', email: 'admin@coreplatform.dev', password: 'admin123' },
  { label: 'Student', email: 'student@coreplatform.dev', password: 'student123' },
  { label: 'Faculty', email: 'faculty@coreplatform.dev', password: 'faculty123' },
  { label: 'Staff (Operator)', email: 'staff@coreplatform.dev', password: 'staff123' },
  { label: 'Staff (Viewer)', email: 'viewer@coreplatform.dev', password: 'viewer123' },
  { label: 'Applicant', email: 'applicant@coreplatform.dev', password: 'applicant123' },
]
