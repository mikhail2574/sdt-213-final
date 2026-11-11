import Badge from '../../components/ui/Badge'
import EmptyState from '../../components/ui/EmptyState'
import { healthTone } from '../../lib/serviceHealth'
import type { ServiceStatus } from '../../types/api'

interface ServiceListProps {
  services: ServiceStatus[]
  showDescriptions?: boolean
}

/** Platform services and connected modules with response time and state (Operational, Degraded, Down). */
export default function ServiceList({ services, showDescriptions = false }: ServiceListProps) {
  if (services.length === 0) return <EmptyState message="No services reported yet." />
  return (
    <ul className="divide-y divide-line">
      {services.map(service => (
        <li key={service.name} className="flex items-center justify-between gap-4 py-3.5">
          <div className="min-w-0">
            <p className="font-medium">{service.name}</p>
            {showDescriptions && service.description && <p className="text-sm text-muted">{service.description}</p>}
          </div>
          <div className="flex shrink-0 items-center gap-4 text-sm">
            {service.latency_ms != null && <span className="text-muted">{service.latency_ms} ms</span>}
            <Badge tone={healthTone(service.status)}>{service.status}</Badge>
          </div>
        </li>
      ))}
    </ul>
  )
}
