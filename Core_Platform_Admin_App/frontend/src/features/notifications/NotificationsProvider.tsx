import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { NotificationsContext, type NotificationsContextValue } from './NotificationsContext'
import { notificationsApi } from '../../api/notificationsApi'
import useInterval from '../../hooks/useInterval'
import useUserActivity from '../../hooks/useUserActivity'
import { errorMessage } from '../../lib/format'
import type { Notification } from '../../types/api'

const POLL_INTERVAL_MS = 60_000
/** Polling pauses after this much inactivity, so an idle session can still time out on the server. */
const IDLE_AFTER_MS = 5 * 60_000

/** Keeps the notification center and the unread counter in sync (FR23). */
export default function NotificationsProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [nextBefore, setNextBefore] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const isActive = useUserActivity(IDLE_AFTER_MS)

  const reload = useCallback(async () => {
    try {
      const inbox = await notificationsApi.list()
      setItems(inbox.items)
      setUnreadCount(inbox.unread_count)
      setHasMore(inbox.has_more)
      setNextBefore(inbox.next_before)
      setError('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }, [])

  const loadMore = useCallback(async () => {
    const inbox = await notificationsApi.list(nextBefore)
    setItems(previous => [...previous, ...inbox.items])
    setUnreadCount(inbox.unread_count)
    setHasMore(inbox.has_more)
    setNextBefore(inbox.next_before)
  }, [nextBefore])

  const markRead = useCallback(
    async (ids: number[]) => {
      await notificationsApi.markRead(ids)
      const now = new Date().toISOString()
      setItems(previous => previous.map(item => (ids.length === 0 || ids.includes(item.id) ? { ...item, read_at: item.read_at ?? now } : item)))
      setUnreadCount(previous => (ids.length === 0 ? 0 : Math.max(0, previous - ids.length)))
    },
    [],
  )

  useEffect(() => {
    void reload()
  }, [reload])

  useInterval(() => {
    if (document.visibilityState === 'visible' && isActive()) void reload()
  }, POLL_INTERVAL_MS)

  const value = useMemo<NotificationsContextValue>(
    () => ({ items, unreadCount, hasMore, loading, error, reload, loadMore, markRead }),
    [items, unreadCount, hasMore, loading, error, reload, loadMore, markRead],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}
