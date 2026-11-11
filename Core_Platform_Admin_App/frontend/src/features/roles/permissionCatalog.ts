import type { AdminSettings, PermissionDefinition } from '../../types/api'

/** Permission list from the settings response, or derived from the roles when the server omits it. */
export function permissionCatalog(data: AdminSettings): PermissionDefinition[] {
  if (data.permissions?.length) return data.permissions
  const codes = [...new Set(data.roles.flatMap(role => role.permissions))].sort()
  return codes.map(code => ({ code, description: code }))
}
