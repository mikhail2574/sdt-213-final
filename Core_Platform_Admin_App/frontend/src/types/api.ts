/**
 * Data shapes of the Core Platform REST API (/api/v1, snake_case JSON), as the backend returns them.
 * The backend rejects unknown request fields, so request types list only accepted fields.
 */

export type Role = 'Administrator' | 'Faculty' | 'Staff' | 'Student' | 'Applicant'
export type AccountStatus = 'Active' | 'Pending' | 'Inactive'
export type ConsoleAccess = 'Operator' | 'Viewer'
/** Permission roles: university roles plus the two console access levels of Staff. */
export type RoleCode = Role | ConsoleAccess
export type ServiceState = 'Operational' | 'Degraded' | 'Down' | 'Disabled' | 'Unknown'
export type AuditResult = 'Success' | 'Failed'
export type Channel = 'in_app' | 'email' | 'both'

export interface User {
  id: number
  name: string
  email: string
  role: Role
  department?: string | null
  console_access?: ConsoleAccess | null
  status?: AccountStatus
  last_login?: string | null
}

/** Offset page (users and directory). */
export interface Page<T> {
  items: T[]
  total: number
  page: number
  size: number
}

/** Cursor page (notifications, conversations, messages): pass `next_before` to load older items. */
export interface CursorPage<T> {
  items: T[]
  has_more: boolean
  next_before: number
}

/* ---------- Authentication ---------- */

export interface Session {
  access_token: string
  token_type: string
  user: User
}

export interface Registration {
  name: string
  email: string
  password: string
  confirm_password: string
  privacy_accepted: boolean
}

/** A confirmation link signs the applicant in; reset and invitation links only set the password. */
export type EmailLinkResponse = Session | { detail: string }

export type EmailLinkPurpose = 'confirm' | 'reset' | 'invite'

export interface PasswordChange {
  current_password: string
  new_password: string
  confirm_password: string
}

export interface ModuleLaunch {
  launch_url: string
  expires_in: number
}

/* ---------- Profile ---------- */

/** Connected module the user may open (FR2, FR30: disabled modules are not returned). */
export interface ModuleLink {
  code: string
  name: string
}

export interface EmailPreference {
  category: string
  email_enabled: boolean
}

export interface Me extends User {
  permissions: string[]
  modules: ModuleLink[]
  preferred_name: string | null
  phone: string | null
  personal_email: string | null
  photo_url: string | null
  email_preferences: EmailPreference[]
}

export interface ProfileUpdate {
  preferred_name?: string
  phone?: string
  personal_email?: string
  email_preferences?: Record<string, boolean>
}

/* ---------- Accounts ---------- */

export interface NewUser {
  name: string
  email: string
  role: Role
  department?: string
  console_access?: ConsoleAccess | null
}

export interface UserUpdate {
  name?: string
  department?: string
  status?: AccountStatus
  role?: Role
  console_access?: ConsoleAccess | null
}

export interface UserFilters {
  q?: string
  role?: string
  status?: string
  department?: string
  page?: number
  size?: number
}

/* ---------- Notifications and announcements ---------- */

export interface Notification {
  id: number
  source: string
  category: string
  title: string
  text: string
  read_at: string | null
  created_at: string
}

export interface Inbox extends CursorPage<Notification> {
  unread_count: number
}

export interface NotificationRequest {
  title: string
  text: string
  category?: string
  channel?: Channel
  /** "ALL", "ROLE:Student", "DEPARTMENT:Computer Science" or "COURSE:<group code>" */
  audience?: string
  user_ids?: number[]
}

export interface Announcement {
  id: string
  sender_id: number
  audience: string
  title: string
  text: string
  channel: Channel
  created_at: string
}

/* ---------- Messages ---------- */

export interface ContactGroup {
  code: string
  title: string
  group_type: 'COURSE' | 'OFFICE'
  owner_id: number
  member_count: number
}

export interface Message {
  id: number
  conversation_id?: number
  sender_id: number
  text: string
  sent_at: string
}

/** A private conversation has two users; a group thread has a group code and title. */
export interface Conversation {
  id: number
  first_user: number | null
  second_user: number | null
  created_at: string
  group_code: string | null
  title: string | null
  /** The latest messages, oldest first. */
  messages: Message[]
}

export type SendMessageRequest = { text: string } & (
  | { conversation_id: number }
  | { recipient_id: number }
  | { group_code: string }
)

/* ---------- Admin Console ---------- */

export interface ServiceStatus {
  code: string
  name?: string
  state: ServiceState
  latency_ms?: number | null
  checked_at?: string | null
}

export interface AuditEntry {
  id: number
  timestamp: string
  actor: string
  action: string
  target: string
  result: AuditResult
}

export interface AuditFilters {
  q?: string
  actor?: string
  action?: string
  result?: string
  /** ISO instants */
  from?: string
  to?: string
}

export interface Dashboard {
  total_users: number
  active_accounts: number
  administrators: number
  pending_reviews: number
  new_users_this_month: number
  growth_percent: number
  recent_activity: AuditEntry[]
  services: ServiceStatus[]
}

export interface ReportRow {
  module: string
  metric: string
  value: string
}

export interface MissingModule {
  module: string
  reason: string
}

export interface Report {
  period: string
  scope: 'platform' | 'own_courses'
  columns: string[]
  rows: ReportRow[]
  missing_modules: MissingModule[]
}

export interface SystemSettings {
  university_name: string
  term_start: string | null
  term_end: string | null
  email_sender: string
  min_password_length: number
  /** Idle session timeout in minutes (NFR7). */
  session_timeout: number
  lockout_attempts: number
}

export interface ConnectedModule {
  code: string
  name: string
  enabled: boolean
}

export interface RolePermissions {
  code: RoleCode
  user_count?: number
  permissions: string[]
}

/** GET /admin/settings; PUT sends the same object back (every module and role exactly once). */
export interface AdminSettings {
  settings: SystemSettings
  modules: ConnectedModule[]
  roles: RolePermissions[]
  permission_codes?: string[]
}
