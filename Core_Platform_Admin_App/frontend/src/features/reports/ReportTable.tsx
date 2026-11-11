import { moduleName } from '../../lib/modules'
import EmptyState from '../../components/ui/EmptyState'
import { Table, Td } from '../../components/ui/Table'
import type { ReportRow } from '../../types/api'

/** One row per metric reported by a module. */
export default function ReportTable({ rows }: { rows: ReportRow[] }) {
  if (rows.length === 0) return <EmptyState message="No module returned data for this period." />
  return (
    <Table headers={['Module', 'Metric', 'Value']}>
      {rows.map((row, index) => (
        <tr key={`${row.module}-${row.metric}-${index}`}>
          <Td className="text-muted">{moduleName(row.module)}</Td>
          <Td className="font-medium">{row.metric}</Td>
          <Td>{row.value}</Td>
        </tr>
      ))}
    </Table>
  )
}
