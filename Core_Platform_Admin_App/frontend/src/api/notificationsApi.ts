import { request } from './client'
import type { NotificationRequest, NotificationsResponse } from '../types/api'

export const notificationsApi = {
  list: () => request<NotificationsResponse>('/notifications'),

  /** An empty array marks every notification as read. */
  markRead: (ids: number[]) => request<null>('/notifications/read', { method: 'POST', body: { ids } }),

  /** Announcements (audience) and targeted notifications (user_ids). */
  send: (payload: NotificationRequest) => request<unknown>('/notifications', { method: 'POST', body: payload }),
}
