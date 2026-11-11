import { Link } from 'react-router-dom'
import { adminApi } from '../../api/adminApi'
import useAuth from '../../auth/useAuth'
import useAsync from '../../hooks/useAsync'
import { PERMISSIONS } from '../../lib/permissions'
import AsyncView from '../../components/ui/AsyncView'
import SectionHeader from '../../components/ui/SectionHeader'
import ServiceList from '../status/ServiceList'
import DashboardStats from './DashboardStats'
import RecentActivity from './RecentActivity'

const LINK_CLASSES = 'text-sm underline-offset-4 hover:underline'

/**
 * UC5 View dashboard (FR8): user statistics, recent administrative activity and platform health.
 * The server returns recent activity to administrators only, so the section is shown to them only.
 */
export default function DashboardPage() {
  const { can } = useAuth()
  const dashboard = useAsync(adminApi.dashboard, [])
  const showActivity = can(PERMISSIONS.AUDIT_VIEW)

  return (
    <AsyncView state={dashboard} loadingLabel="Loading dashboard…">
      {data => (
        <>
          <DashboardStats data={data} />
          <div className={`grid gap-14 ${showActivity ? 'lg:grid-cols-[1.4fr_1fr]' : 'max-w-2xl'}`}>
            {showActivity && (
              <section>
                <SectionHeader
                  title="Recent activity"
                  actions={
                    <Link to="/admin/audit" className={LINK_CLASSES}>
                      View all
                    </Link>
                  }
                />
                <RecentActivity entries={data.recent_activity} />
              </section>
            )}
            <section>
              <SectionHeader
                title="Platform health"
                actions={
                  <Link to="/admin/status" className={LINK_CLASSES}>
                    Details
                  </Link>
                }
              />
              <ServiceList services={data.services} />
            </section>
          </div>
        </>
      )}
    </AsyncView>
  )
}
