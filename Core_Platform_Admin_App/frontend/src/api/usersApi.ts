import { request } from './client'
import { toList, type ListResponse } from '../lib/collections'
import type { NewUser, User, UserFilters, UserUpdate } from '../types/api'

export const usersApi = {
  /** The Admin Console gets every field; other roles get the directory view (name, role, department, email). */
  list: (filters: UserFilters = {}) => request<ListResponse<User>>('/users', { params: { ...filters } }).then(toList),

  /** Creates the account and sends an invitation email to set a password. */
  create: (user: NewUser) => request<User>('/users', { method: 'POST', body: user }),

  update: (id: number, changes: UserUpdate) => request<User>(`/users/${id}`, { method: 'PATCH', body: changes }),

  /** FR14: administrators and operators reuse the forgot-password endpoint with the user's email. */
  sendPasswordReset: (email: string) => request<null>('/auth/forgot-password', { method: 'POST', body: { email } }),
}
