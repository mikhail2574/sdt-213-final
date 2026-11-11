import { request } from './client'
import type { NewUser, Page, RolePermissions, User, UserFilters, UserUpdate } from '../types/api'

export const usersApi = {
  /**
   * Console users (users.view) get every field and every account; others get the directory view
   * of active accounts (name, email, role, department).
   */
  list: (filters: UserFilters = {}) => request<Page<User>>('/users', { params: { ...filters } }),

  /** Creates a Pending account and sends an invitation email to set a password (FR11). */
  create: (user: NewUser) => request<User>('/users', { method: 'POST', body: user }),

  update: (id: number, changes: UserUpdate) => request<User>(`/users/${id}`, { method: 'PATCH', body: changes }),

  /** FR14: with a token, the forgot-password endpoint sends a reset link to another user (users.edit). */
  sendPasswordReset: (email: string) => request<{ detail: string }>('/auth/forgot-password', { method: 'POST', body: { email } }),

  /** Read-only role/permission matrix for console users (users.view). */
  roles: () => request<RolePermissions[]>('/roles'),
}
