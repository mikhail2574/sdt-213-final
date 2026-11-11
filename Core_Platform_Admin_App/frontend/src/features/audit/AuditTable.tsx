import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { Table, Td } from '../../components/ui/Table'
import { formatDateTime } from '../../lib/format'
import type { AuditEntry } from '../../types/api'

/** Read-only audit records, newest first (NFR4: they cannot be edited or deleted). */
export default function AuditTable({ entries }: { entries: AuditEntry[] }) {
  if (entries.length === 0) return <EmptyState message="No records match the filters." />
  return (
    <Table headers={['Time', 'Actor', 'Action', 'Target', 'Result']}>
      {entries.map(entry => (
        <tr key={entry.id}>
          <Td className="whitespace-nowrap text-muted">{formatDateTime(entry.timestamp)}</Td>
          <Td>{entry.actor}</Td>
          <Td className="font-medium">{entry.action}</Td>
          <Td className="text-muted">{entry.target}</Td>
          <Td>
            {entry.result === 'Failed' ? <Badge tone="rose">Failed</Badge> : <span className="text-muted">Success</span>}
          </Td>
        </tr>
      ))}
    </Table>
  )
}
