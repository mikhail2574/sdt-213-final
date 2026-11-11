import { request } from './client'
import type { EmailLinkResponse, ModuleLaunch, PasswordChange, Registration, Session, User } from '../types/api'

export const authApi = {
  login: (email: string, password: string) =>
    request<Session>('/auth/login', { method: 'POST', body: { email, password }, auth: false }),

  logout: () => request<null>('/auth/logout', { method: 'POST' }),

  /** Creates an Applicant in Pending status and queues a confirmation email (UC4). */
  register: (data: Registration) => request<User>('/auth/register', { method: 'POST', body: data, auth: false }),

  /** Always answers neutrally, whether or not the account exists. */
  forgotPassword: (email: string) =>
    request<{ detail: string }>('/auth/forgot-password', { method: 'POST', body: { email }, auth: false }),

  /**
   * Redeems a link sent by email. A confirmation link is sent without a password and signs the
   * applicant in; reset and invitation links carry the new password.
   */
  emailLink: (token: string, password?: string, confirmation?: string) =>
    request<EmailLinkResponse>('/auth/email-link', {
      method: 'POST',
      body: password !== undefined ? { token, password, confirm_password: confirmation ?? password } : { token },
      auth: false,
    }),

  /** Ends every session of the user, including the current one (UC3). */
  changePassword: (change: PasswordChange) => request<null>('/auth/change-password', { method: 'POST', body: change }),

  /** One-time ticket that signs the user in to a connected module (FR2). */
  moduleTicket: (code: string) => request<ModuleLaunch>('/auth/module-ticket', { method: 'POST', body: { code } }),
}
