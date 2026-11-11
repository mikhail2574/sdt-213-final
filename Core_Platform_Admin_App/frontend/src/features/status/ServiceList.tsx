import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { formatRelative } from '../../lib/format'
import { healthTone, serviceLabel } from '../../lib/serviceHealth'
import type { ServiceStatus } from '../../types/api'

interface ServiceListProps {
  services: ServiceStatus[]
  /** Shows when each service was last checked. */
  showChecked?: boolean
}

/** Platform services and connected modules with response time and state (FR31). */
export default function ServiceList({ services, showChecked = false }: ServiceListProps) {
  if (services.length === 0) return <EmptyState message="No services reported yet." />
  return (
    <ul className="divide-y divide-line">
      {services.map(service => (
        <li key={service.code} className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="font-medium">{serviceLabel(service)}</p>
            {showChecked && service.checked_at && <p className="text-sm text-muted">Checked {formatRelative(service.checked_at)}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm">
            {service.state !== 'Disabled' && service.latency_ms ? <span className="text-muted">{service.latency_ms} ms</span> : null}
            <Badge tone={healthTone(service.state)}>{service.state}</Badge>
          </div>
        </li>
      ))}
    </ul>
  )
}
