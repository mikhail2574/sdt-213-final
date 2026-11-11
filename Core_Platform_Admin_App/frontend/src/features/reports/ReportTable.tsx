import EmptyState from '../../components/ui/EmptyState'
import { Table, Td } from '../../components/ui/Table'
import type { Report } from '../../types/api'

export default function ReportTable({ report }: { report: Report }) {
  if (report.rows.length === 0) return <EmptyState message="No data for this period." />
  return (
    <Table headers={report.columns}>
      {report.rows.map((row, rowIndex) => (
        <tr key={rowIndex}>
          {row.map((cell, cellIndex) => (
            <Td key={cellIndex} className={cellIndex === 0 ? 'font-medium' : undefined}>
              {cell}
            </Td>
          ))}
        </tr>
      ))}
    </Table>
  )
}
