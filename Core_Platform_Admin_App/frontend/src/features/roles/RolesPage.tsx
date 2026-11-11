import { adminApi } from '../../api/adminApi'
import { usersApi } from '../../api/usersApi'
import useAuth, { useCurrentUser } from '../../auth/useAuth'
import useAsync from '../../hooks/useAsync'
import { PERMISSIONS } from '../../lib/permissions'
import AsyncView from '../../components/ui/AsyncView'
import type { AdminSettings, RolePermissions as Role } from '../../types/api'
import RoleOverview from './RoleOverview'
import RolePermissions from './RolePermissions'

/**
 * UC11 Manage roles and permissions (FR19, FR21). Administrators read and save the roles together
 * with the settings (GET/PUT /admin/settings); other console users see them read-only (GET /roles).
 */
export default function RolesPage() {
  const user = useCurrentUser()
  const { can } = useAuth()
  const canEdit = user.role === 'Administrator' && can(PERMISSIONS.SETTINGS_MANAGE)
  const data = useAsync<{ roles: Role[]; settings?: AdminSettings }>(
    () => (canEdit ? adminApi.settings().then(settings => ({ roles: settings.roles, settings })) : usersApi.roles().then(roles => ({ roles }))),
    [canEdit],
  )

  return (
    <AsyncView state={data} loadingLabel="Loading roles…">
      {({ roles, settings }) => (
        <>
          <RoleOverview roles={roles} />
          <RolePermissions
            roles={roles}
            permissionCodes={settings?.permission_codes ?? [...new Set(roles.flatMap(role => role.permissions))]}
            onSave={
              settings
                ? async next => {
                    const updated = await adminApi.saveSettings({ ...settings, roles: next })
                    data.setData({ roles: updated.roles, settings: updated })
                  }
                : undefined
            }
          />
        </>
      )}
    </AsyncView>
  )
}
