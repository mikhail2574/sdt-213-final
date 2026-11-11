import { createContext } from 'react'
import type { Notification } from '../../types/api'

export interface NotificationsContextValue {
  items: Notification[]
  unreadCount: number
  hasMore: boolean
  loading: boolean
  error: string
  reload: () => Promise<void>
  /** Appends the next page of older notifications. */
  loadMore: () => Promise<void>
  /** Marks the given notifications as read; an empty array marks all of them. */
  markRead: (ids: number[]) => Promise<void>
}

export const NotificationsContext = createContext<NotificationsContextValue | null>(null)
