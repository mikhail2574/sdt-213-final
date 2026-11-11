import type { RolePermissions } from '../../types/api'
import { plural } from '../../lib/format'
import { ROLE_DESCRIPTIONS } from './permissionCatalog'

/** One line per role: name, description, number of users (administrators only) and permissions. */
export default function RoleOverview({ roles }: { roles: RolePermissions[] }) {
  return (
    <div className="mb-14 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
      {roles.map(role => (
        <div key={role.code}>
          <p className="font-semibold">{role.code}</p>
          <p className="mt-1 text-sm text-muted">{ROLE_DESCRIPTIONS[role.code]}</p>
          <p className="mt-2 text-sm">
            {role.user_count !== undefined && `${plural(role.user_count, 'user')} · `}
            {plural(role.permissions.length, 'permission')}
          </p>
        </div>
      ))}
    </div>
  )
}
