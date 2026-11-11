import { adminApi } from '../../api/adminApi'
import useAsync from '../../hooks/useAsync'
import AsyncView from '../../components/ui/AsyncView'
import RoleOverview from './RoleOverview'
import RolePermissions from './RolePermissions'

/** UC11 Manage roles and permissions (FR19, FR21). Roles come from GET /admin/settings. */
export default function RolesPage() {
  const settings = useAsync(adminApi.settings, [])
  return (
    <AsyncView state={settings} loadingLabel="Loading roles…">
      {data => (
        <>
          <RoleOverview roles={data.roles} />
          <RolePermissions data={data} onSaved={settings.reload} />
        </>
      )}
    </AsyncView>
  )
}
