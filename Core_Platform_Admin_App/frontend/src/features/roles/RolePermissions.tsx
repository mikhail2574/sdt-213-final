import { useState } from 'react'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import type { RoleCode, RolePermissions as Role } from '../../types/api'
import PermissionMatrix from './PermissionMatrix'
import { orderedPermissions } from './permissionCatalog'

interface RolePermissionsProps {
  roles: Role[]
  permissionCodes: string[]
  /** Saves the edited roles; without it the matrix is read-only. */
  onSave?: (roles: Role[]) => Promise<unknown>
}

/** UC11: review and, for administrators, edit the permissions of each role (FR19, FR21). */
export default function RolePermissions({ roles, permissionCodes, onSave }: RolePermissionsProps) {
  const [draft, setDraft] = useState<Role[] | null>(null)
  const [saved, setSaved] = useState(false)
  const editing = draft !== null
  const save = useAction(async (next: Role[]) => {
    await onSave?.(next)
    return true
  })

  function toggle(code: RoleCode, permission: string, enabled: boolean) {
    setDraft(current =>
      (current ?? roles).map(role =>
        role.code !== code
          ? role
          : { ...role, permissions: enabled ? [...role.permissions, permission] : role.permissions.filter(item => item !== permission) },
      ),
    )
  }

  async function submit() {
    if (draft && (await save.run(draft))) {
      setDraft(null)
      setSaved(true)
    }
  }

  const actions = !onSave ? null : editing ? (
    <>
      <Button
        variant="quiet"
        onClick={() => {
          setDraft(null)
          save.setError('')
        }}
      >
        Cancel
      </Button>
      <Button variant="primary" onClick={() => void submit()} busy={save.busy} busyText="Saving…">
        Save permissions
      </Button>
    </>
  ) : (
    <Button
      variant="secondary"
      onClick={() => {
        setDraft(roles)
        setSaved(false)
      }}
    >
      Edit permissions
    </Button>
  )

  return (
    <section>
      <SectionHeader title="Capabilities by role" description="Changes apply to every user of the role on their next request." actions={actions} />
      {(save.error || saved) && (
        <div className="mb-4">{save.error ? <Alert>{save.error}</Alert> : <Alert tone="success">Permissions saved.</Alert>}</div>
      )}
      <PermissionMatrix roles={draft ?? roles} permissions={orderedPermissions(permissionCodes)} editing={editing} onToggle={toggle} />
    </section>
  )
}
