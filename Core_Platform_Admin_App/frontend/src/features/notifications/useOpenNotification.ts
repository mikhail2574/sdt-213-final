import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import useNotifications from './useNotifications'
import type { Notification } from '../../types/api'

/** Pages that notifications of a category relate to. */
const PAGES: Record<string, string> = { messages: '/messages' }

/** Selecting a notification marks it as read and opens the related page, if there is one (UC13 step 3). */
export default function useOpenNotification() {
  const { markRead } = useNotifications()
  const navigate = useNavigate()

  return useCallback(
    async (notification: Notification) => {
      if (!notification.read_at) await markRead([notification.id]).catch(() => undefined)
      const page = PAGES[notification.category]
      if (page) navigate(page)
    },
    [markRead, navigate],
  )
}
