import type { RoleDefinition } from '../../types/api'

/** One line per role: name, description, users and number of permissions. */
export default function RoleOverview({ roles }: { roles: RoleDefinition[] }) {
  return (
    <div className="mb-14 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
      {roles.map(role => (
        <div key={role.name}>
          <p className="font-semibold">{role.name}</p>
          {role.description && <p className="mt-1 text-sm text-muted">{role.description}</p>}
          <p className="mt-2 text-sm">
            {role.user_count ?? 0} users · {role.permissions.length} permissions
          </p>
        </div>
      ))}
    </div>
  )
}
