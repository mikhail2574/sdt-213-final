import { request } from './client'
import type { EmailLinkResponse, LoginResponse } from '../types/api'

export interface RegistrationData {
  name: string
  email: string
  password: string
}

export const authApi = {
  login: (email: string, password: string) =>
    request<LoginResponse>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  logout: () => request<null>('/auth/logout', { method: 'POST' }),

  /** Creates an Applicant in Pending status and sends a confirmation email. */
  register: (data: RegistrationData) => request<null>('/auth/register', { method: 'POST', body: data, auth: false }),

  forgotPassword: (email: string) =>
    request<null>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  /**
   * Handles every e-mail link: without a password it confirms an applicant's email,
   * with a password it sets a new one (after a reset or an invitation).
   */
  emailLink: (token: string, password?: string) =>
    request<EmailLinkResponse | null>('/auth/email-link', {
      method: 'POST',
      body: password ? { token, password } : { token },
      auth: false,
    }),
}
