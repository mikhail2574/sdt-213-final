import { request } from './client'
import type { Me, MeUpdate } from '../types/api'

export const meApi = {
  get: () => request<Me>('/me'),
  /** Profile fields, `email_preferences`, or `{ current_password, new_password, confirm_password }`. */
  update: (changes: MeUpdate) => request<Me | null>('/me', { method: 'PATCH', body: changes }),
}
