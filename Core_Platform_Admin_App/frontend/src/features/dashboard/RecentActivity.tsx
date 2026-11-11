import EmptyState from '../../components/ui/EmptyState'
import { formatRelative } from '../../lib/format'
import type { AuditEntry } from '../../types/api'

export default function RecentActivity({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <EmptyState message="No recent activity." />
  return (
    <ul className="divide-y divide-line">
      {entries.map(entry => (
        <li key={entry.id} className="flex items-start justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="font-medium">
              {entry.action}
              {entry.result === 'Failed' && <span className="ml-2 text-sm font-normal text-muted">failed</span>}
            </p>
            <p className="truncate text-sm text-muted">
              {entry.target && entry.target !== entry.actor ? `${entry.actor} · ${entry.target}` : entry.actor}
            </p>
          </div>
          <time dateTime={entry.timestamp} className="shrink-0 text-sm text-muted">
            {formatRelative(entry.timestamp)}
          </time>
        </li>
      ))}
    </ul>
  )
}
