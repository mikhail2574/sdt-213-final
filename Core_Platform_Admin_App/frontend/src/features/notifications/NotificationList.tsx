import EmptyState from '../../components/ui/EmptyState'
import type { Notification } from '../../types/api'
import NotificationItem from './NotificationItem'
import useOpenNotification from './useOpenNotification'

interface NotificationListProps {
  items: Notification[]
  emptyMessage: string
}

export default function NotificationList({ items, emptyMessage }: NotificationListProps) {
  const openNotification = useOpenNotification()
  if (items.length === 0) return <EmptyState message={emptyMessage} />
  return (
    <ul className="divide-y divide-line">
      {items.map(item => (
        <li key={item.id}>
          <NotificationItem notification={item} onOpen={openNotification} />
        </li>
      ))}
    </ul>
  )
}
