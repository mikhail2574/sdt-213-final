import StatCard from '../../components/ui/StatCard'
import type { ReportMetric } from '../../types/api'

/** Key numbers of the report, e.g. enrolled students (SIS) or active courses (LMS Core). */
export default function ReportSummary({ metrics }: { metrics: ReportMetric[] }) {
  if (metrics.length === 0) return null
  return (
    <div className="mb-12 grid grid-cols-2 gap-8 lg:grid-cols-4">
      {metrics.map(metric => (
        <StatCard key={metric.label} label={metric.label} value={metric.value} note={[metric.source, metric.note].filter(Boolean).join(' · ')} />
      ))}
    </div>
  )
}
