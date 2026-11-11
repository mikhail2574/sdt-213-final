import type { Dashboard, HealthState, ServiceStatus } from '../types/api'
import type { Tone } from '../components/ui/Badge'

const TONES: Record<HealthState, Tone> = { Operational: 'blue', Degraded: 'lilac', Down: 'rose' }

export function healthTone(status: HealthState): Tone {
  return TONES[status] ?? 'neutral'
}

/** The dashboard returns `services`; older responses had a single `service` object. */
export function servicesFrom(dashboard?: Dashboard): ServiceStatus[] {
  if (Array.isArray(dashboard?.services)) return dashboard.services
  return dashboard?.service ? [dashboard.service] : []
}

export function overallHealth(services: ServiceStatus[]): HealthState {
  if (services.some(service => service.status === 'Down')) return 'Down'
  if (services.some(service => service.status !== 'Operational')) return 'Degraded'
  return 'Operational'
}
