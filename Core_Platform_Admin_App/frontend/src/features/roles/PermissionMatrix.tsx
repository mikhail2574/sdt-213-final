import { Table, Td } from '../../components/ui/Table'
import type { RoleCode, RolePermissions } from '../../types/api'
import { PERMISSION_LABELS } from './permissionCatalog'
import { fixedPermission } from './permissionRules'

interface PermissionMatrixProps {
  roles: RolePermissions[]
  permissions: string[]
  editing: boolean
  onToggle: (role: RoleCode, code: string, enabled: boolean) => void
}

/** Capabilities by role (FR19); checkboxes appear in edit mode (FR21). */
export default function PermissionMatrix({ roles, permissions, editing, onToggle }: PermissionMatrixProps) {
  return (
    <Table headers={['Permission', ...roles.map(role => role.code)]}>
      {permissions.map(code => {
        const label = PERMISSION_LABELS[code] ?? code
        return (
          <tr key={code}>
            <Td>
              <span className="block">{label}</span>
              <span className="block text-xs text-muted">{code}</span>
            </Td>
            {roles.map(role => {
              const enabled = role.permissions.includes(code)
              return (
                <Td key={role.code}>
                  {editing ? (
                    <input
                      type="checkbox"
                      className="size-4 accent-lilac-deep disabled:opacity-40"
                      aria-label={`${role.code}: ${label}`}
                      checked={enabled}
                      disabled={fixedPermission(role.code, code) !== null}
                      onChange={event => onToggle(role.code, code, event.target.checked)}
                    />
                  ) : enabled ? (
                    <span aria-label="Allowed">✓</span>
                  ) : (
                    <span aria-label="Not allowed" className="text-muted">
                      —
                    </span>
                  )}
                </Td>
              )
            })}
          </tr>
        )
      })}
    </Table>
  )
}
