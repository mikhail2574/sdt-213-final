import { adminApi } from '../../api/adminApi'
import useAsync from '../../hooks/useAsync'
import useInterval from '../../hooks/useInterval'
import { formatDateTime } from '../../lib/format'
import { overallHealth, servicesFrom } from '../../lib/serviceHealth'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import ServiceList from './ServiceList'

const REFRESH_MS = 30_000

const SUMMARY = {
  Operational: 'All services are operational.',
  Degraded: 'Some services are slow or partly working.',
  Down: 'At least one service is unavailable.',
}

/** UC18 Monitor system status (FR31). Data comes from GET /admin/dashboard; alerts to admins are sent by the server (FR32). */
export default function SystemStatusPage() {
  const dashboard = useAsync(adminApi.dashboard, [])
  useInterval(dashboard.reload, REFRESH_MS)

  return (
    <AsyncView state={dashboard} loadingLabel="Checking services…">
      {data => {
        const services = servicesFrom(data)
        const checkedAt = services.map(service => service.checked_at).find(Boolean)
        return (
          <>
            <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-lg">{SUMMARY[overallHealth(services)]}</p>
                {checkedAt && <p className="text-sm text-muted">Last checked {formatDateTime(checkedAt)}</p>}
              </div>
              <Button variant="quiet" onClick={dashboard.reload} disabled={dashboard.loading}>
                Refresh
              </Button>
            </div>
            <ServiceList services={services} showDescriptions />
          </>
        )
      }}
    </AsyncView>
  )
}
