import StatCard from '../../components/ui/StatCard'
import type { Dashboard } from '../../types/api'

export default function DashboardStats({ data }: { data: Dashboard }) {
  const share = data.total_users ? Math.round((data.active_accounts / data.total_users) * 100) : 0
  return (
    <div className="mb-14 grid grid-cols-2 gap-8 lg:grid-cols-4">
      <StatCard label="Users" value={data.total_users} note={data.new_users_this_month ? `+${data.new_users_this_month} this month${data.growth_percent ? `, ${data.growth_percent}% growth` : ''}` : undefined} />
      <StatCard label="Active accounts" value={data.active_accounts} note={`${share}% of all users`} />
      <StatCard label="Administrators" value={data.administrators} />
      <StatCard label="Pending reviews" value={data.pending_reviews} note={data.pending_reviews ? 'Waiting for activation' : undefined} />
    </div>
  )
}
