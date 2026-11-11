import type { ServiceState, ServiceStatus } from '../types/api'
import type { Tone } from '../components/ui/Badge'

const TONES: Record<ServiceState, Tone> = {
  Operational: 'blue',
  Degraded: 'lilac',
  Down: 'rose',
  Disabled: 'neutral',
  Unknown: 'neutral',
}

/** Platform services reported by code only; connected modules come with their own name. */
const LABELS: Record<string, string> = {
  core: 'Core API',
  database: 'Database',
  identity: 'Sign-in and sessions',
  gateway: 'API gateway',
  audit: 'Activity log',
  email: 'Email delivery',
  monitoring: 'Monitoring',
}

export function healthTone(state: ServiceState): Tone {
  return TONES[state] ?? 'neutral'
}

export function serviceLabel(service: ServiceStatus): string {
  return service.name ?? LABELS[service.code] ?? service.code
}

/** Overall state of the services that are switched on. */
export function overallHealth(services: ServiceStatus[]): ServiceState {
  const active = services.filter(service => service.state !== 'Disabled')
  if (active.some(service => service.state === 'Down')) return 'Down'
  if (active.some(service => service.state === 'Degraded')) return 'Degraded'
  if (active.some(service => service.state === 'Unknown')) return 'Unknown'
  return 'Operational'
}
