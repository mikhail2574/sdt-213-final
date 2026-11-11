import EmptyState from '../../components/ui/EmptyState'
import { formatRelative } from '../../lib/format'
import type { Announcement } from '../../types/api'
import { describeAudience } from './audience'

/** Sent announcements: every one for administrators, own ones for everyone else. */
export default function AnnouncementHistory({ items }: { items: Announcement[] }) {
  if (items.length === 0) return <EmptyState message="No announcements sent yet." />
  return (
    <ul className="divide-y divide-line">
      {items.map(item => (
        <li key={item.id} className="py-4">
          <p className="font-medium">{item.title}</p>
          <p className="mt-0.5 line-clamp-2 text-sm text-muted">{item.text}</p>
          <p className="mt-1 text-xs text-muted">
            {describeAudience(item.audience)} · {formatRelative(item.created_at)}
          </p>
        </li>
      ))}
    </ul>
  )
}
