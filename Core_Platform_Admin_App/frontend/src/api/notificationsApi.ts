import { request } from './client'
import type { Announcement, Inbox, NotificationRequest } from '../types/api'

export const notificationsApi = {
  /** Newest first; pass `before` (the previous page's `next_before`) for older items. */
  list: (before = 0) => request<Inbox>('/notifications', { params: { before: before || undefined } }),

  /** An empty array marks every notification as read. */
  markRead: (ids: number[]) => request<null>('/notifications/read', { method: 'POST', body: { ids } }),

  /** Announcements (audience) and targeted notifications (user_ids). */
  send: (payload: NotificationRequest) =>
    request<{ id: string; recipients: number }>('/notifications', { method: 'POST', body: payload }),

  /** Sent announcements: all for administrators, own for everyone else. */
  announcements: () => request<Announcement[]>('/announcements'),
}
