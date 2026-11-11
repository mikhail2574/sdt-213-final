/**
 * Data shapes of the Core Platform REST API (/api/v1, snake_case JSON).
 * Fields marked optional are either role-dependent (directory view vs. admin view)
 * or not yet returned by every backend version.
 */

export type Role = 'Administrator' | 'Faculty' | 'Staff' | 'Student' | 'Applicant'
export type AccountStatus = 'Active' | 'Pending' | 'Inactive'
export type ConsoleAccess = 'Operator' | 'Viewer'
export type HealthState = 'Operational' | 'Degraded' | 'Down' | 'Unknown' | 'Disabled'
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
  phone?: string | null
  last_login?: string | null
  last_active_at?: string | null
}

/** Tile on the home page (FR2, FR30: disabled modules are not returned). */
export interface ModuleTile {
  code: string
  name: string
  description?: string
  url?: string | null
  summary?: string | null
}

export type EmailNotificationSettings = Record<string, boolean>

export interface Me extends User {
  permissions?: string[]
  modules?: ModuleTile[]
  preferred_name?: string | null
  personal_email?: string | null
  photo_url?: string | null
  student_id?: string | null
  email_preferences?: { category: string; email_enabled: boolean }[]
}

export interface MeUpdate {
  preferred_name?: string
  phone?: string
  personal_email?: string
  photo_url?: string
  email_preferences?: EmailNotificationSettings
  current_password?: string
  new_password?: string
  confirm_password?: string
}

export interface LoginResponse {
  access_token: string
  user: User
}

/** `/auth/email-link` may sign the applicant in right after confirmation. */
export interface EmailLinkResponse {
  access_token?: string
  detail?: string
}

export interface NewUser {
  name: string
  email: string
  role: Role
  department?: string
  console_access?: ConsoleAccess | null
}

export type UserUpdate = Partial<Omit<NewUser, 'email'>> & { status?: AccountStatus }

export interface UserFilters {
  q?: string
  role?: string
  status?: string
  department?: string
}

export interface Notification {
  id: number
  source?: string
  category?: string
  title: string
  text: string
  created_at: string
  read_at: string | null
  link?: string | null
}

export interface NotificationsResponse {
  unread_count: number
  items: Notification[]
}

export interface NotificationRequest {
  title: string
  text: string
  category: string
  channel: Channel
  /** "ALL", "ROLE:Student", "DEPARTMENT:Computer Science" */
  audience?: string
  user_ids?: number[]
}

export interface Participant {
  id: number
  name: string
  role?: Role
}

export interface Message {
  id: number
  sender_id: number
  sender_name?: string
  text: string
  sent_at: string
}

export interface Conversation {
  id: number
  title?: string | null
  is_group?: boolean
  first_user: number | null
  second_user: number | null
  group_code?: string | null
  participants?: Participant[]
  messages: Message[]
}

export type SendMessageRequest = { text: string } & ({ conversation_id: number } | { recipient_id: number } | { group_code: string })

export interface SendMessageResponse {
  id?: number
  conversation_id?: number
}

export interface ServiceStatus {
  code: string
  name?: string
  description?: string
  state: HealthState
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
  from?: string
  to?: string
}

export interface Dashboard {
  total_users: number
  active_accounts: number
  administrators: number
  pending_reviews: number
  users_this_month?: number
  recent_activity: AuditEntry[]
  services?: ServiceStatus[]
  /** Older response: a single Core API status. */
  service: { name: string; status: HealthState }
}

export interface ReportMetric {
  label: string
  value: string | number
  source?: string
  note?: string
}

/** Follows the Report class of the design: title, period, columns and rows. */
export interface Report {
  period: string
  scope: 'platform' | 'own_courses'
  columns: string[]
  rows: Record<string, string | number>[]
  missing_modules: { module: string; reason: string }[]
}

export interface SystemSettings {
  university_name: string
  term_start: string | null
  term_end: string | null
  email_sender: string
  min_password_length: number
  session_timeout: number
  lockout_attempts: number
}

export interface ConnectedModule {
  code: string
  name: string
  enabled: boolean
  base_url?: string
}

export interface RoleDefinition {
  code: string
  description?: string
  type?: 'University' | 'Console'
  user_count?: number
  permissions: string[]
}

export interface PermissionDefinition {
  code: string
  description: string
}

export interface AdminSettings {
  settings: SystemSettings
  modules: ConnectedModule[]
  roles: RoleDefinition[]
  permissions?: PermissionDefinition[]
  permission_codes: string[]
}
