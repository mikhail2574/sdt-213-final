import { Table, Td } from '../../components/ui/Table'
import type { PermissionDefinition, RoleDefinition } from '../../types/api'

interface PermissionMatrixProps {
  roles: RoleDefinition[]
  permissions: PermissionDefinition[]
  editing: boolean
  onToggle: (roleName: string, code: string, enabled: boolean) => void
}

/** Capabilities by role (FR19); checkboxes appear in edit mode (FR21). */
export default function PermissionMatrix({ roles, permissions, editing, onToggle }: PermissionMatrixProps) {
  return (
    <Table headers={['Permission', ...roles.map(role => role.name)]}>
      {permissions.map(permission => (
        <tr key={permission.code}>
          <Td>
            <span className="block">{permission.description}</span>
            {permission.description !== permission.code && <span className="block text-xs text-muted">{permission.code}</span>}
          </Td>
          {roles.map(role => {
            const enabled = role.permissions.includes(permission.code)
            return (
              <Td key={role.name}>
                {editing ? (
                  <input
                    type="checkbox"
                    className="size-4 accent-lilac-deep"
                    aria-label={`${role.name}: ${permission.description}`}
                    checked={enabled}
                    onChange={event => onToggle(role.name, permission.code, event.target.checked)}
                  />
                ) : (
                  <span aria-label={enabled ? 'Allowed' : 'Not allowed'}>{enabled ? '✓' : <span className="text-muted">—</span>}</span>
                )}
              </Td>
            )
          })}
        </tr>
      ))}
    </Table>
  )
}
