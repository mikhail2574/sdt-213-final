import { Link } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import useAuth from '../../auth/useAuth'
import useAsync from '../../hooks/useAsync'
import { PERMISSIONS } from '../../lib/permissions'
import { servicesFrom } from '../../lib/serviceHealth'
import AsyncView from '../../components/ui/AsyncView'
import SectionHeader from '../../components/ui/SectionHeader'
import ServiceList from '../status/ServiceList'
import DashboardStats from './DashboardStats'
import RecentActivity from './RecentActivity'

const viewAllClasses = 'text-sm underline-offset-4 hover:underline'

/** UC5 View dashboard (FR8): user statistics, recent administrative activity and platform health. */
export default function DashboardPage() {
  const { can } = useAuth()
  const dashboard = useAsync(adminApi.dashboard, [])

  return (
    <AsyncView state={dashboard} loadingLabel="Loading dashboard…">
      {data => (
        <>
          <DashboardStats data={data} />
          <div className="grid gap-14 lg:grid-cols-[1.4fr_1fr]">
            <section>
              <SectionHeader
                title="Recent activity"
                actions={
                  can(PERMISSIONS.AUDIT_VIEW) && (
                    <Link to="/admin/audit" className={viewAllClasses}>
                      View all
                    </Link>
                  )
                }
              />
              <RecentActivity entries={data.recent_activity ?? []} />
            </section>
            <section>
              <SectionHeader
                title="Platform health"
                actions={
                  can(PERMISSIONS.DASHBOARD_VIEW) && (
                    <Link to="/admin/status" className={viewAllClasses}>
                      Details
                    </Link>
                  )
                }
              />
              <ServiceList services={servicesFrom(data)} />
            </section>
          </div>
        </>
      )}
    </AsyncView>
  )
}
