import { formatRelative } from '../../lib/format'
import type { Notification } from '../../types/api'

interface NotificationItemProps {
  notification: Notification
  onOpen: (notification: Notification) => void
}

/** One row of the notification list. Unread rows have a lilac dot and a bold title. */
export default function NotificationItem({ notification, onOpen }: NotificationItemProps) {
  const unread = !notification.read_at
  const meta = [notification.source, formatRelative(notification.created_at)].filter(Boolean).join(' · ')

  return (
    <button type="button" onClick={() => onOpen(notification)} className="flex w-full gap-3 py-4 text-left hover:text-lilac-deep">
      <span className={`mt-2 size-1.5 shrink-0 rounded-full ${unread ? 'bg-lilac-deep' : ''}`}>
        {unread && <span className="sr-only">Unread</span>}
      </span>
      <span className="min-w-0">
        <span className={`block ${unread ? 'font-semibold' : ''}`}>{notification.title}</span>
        <span className="mt-0.5 block text-sm text-muted">{notification.text}</span>
        <span className="mt-1 block text-xs text-muted">{meta}</span>
      </span>
    </button>
  )
}
