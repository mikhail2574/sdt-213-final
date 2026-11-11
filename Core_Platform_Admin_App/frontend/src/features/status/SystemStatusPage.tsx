import { adminApi } from '../../api/adminApi'
import useAsync from '../../hooks/useAsync'
import useInterval from '../../hooks/useInterval'
import { overallHealth } from '../../lib/serviceHealth'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import type { ServiceState } from '../../types/api'
import ServiceList from './ServiceList'

const REFRESH_MS = 30_000

const SUMMARY: Record<ServiceState, string> = {
  Operational: 'All services are operational.',
  Degraded: 'Some services are slow or partly working.',
  Down: 'At least one service is unavailable.',
  Unknown: 'Some services have not reported their state yet.',
  Disabled: 'All connected modules are switched off.',
}

/** UC18 Monitor system status (FR31). The server checks services every 30 seconds and alerts administrators (FR32). */
export default function SystemStatusPage() {
  const dashboard = useAsync(adminApi.dashboard, [])
  useInterval(dashboard.reload, REFRESH_MS)

  return (
    <AsyncView state={dashboard} loadingLabel="Checking services…">
      {data => (
        <>
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="text-lg">{SUMMARY[overallHealth(data.services)]}</p>
            <Button variant="quiet" onClick={dashboard.reload} disabled={dashboard.loading}>
              Refresh
            </Button>
          </div>
          <ServiceList services={data.services} showChecked />
        </>
      )}
    </AsyncView>
  )
}
