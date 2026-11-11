import { useState } from 'react'
import { adminApi } from '../../api/adminApi'
import useAuth from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { PERMISSIONS } from '../../lib/permissions'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import type { AdminSettings, RoleDefinition } from '../../types/api'
import PermissionMatrix from './PermissionMatrix'
import { permissionCatalog } from './permissionCatalog'

interface RolePermissionsProps {
  data: AdminSettings
  onSaved: () => void
}

/** UC11: review and edit the permissions of each role. Saved with the rest of the settings (PUT /admin/settings). */
export default function RolePermissions({ data, onSaved }: RolePermissionsProps) {
  const { can } = useAuth()
  const [draft, setDraft] = useState<RoleDefinition[] | null>(null)
  const editing = draft !== null
  const roles = draft ?? data.roles

  const save = useAction(async (next: RoleDefinition[]) => {
    await adminApi.saveSettings({ ...data, roles: next })
    return true
  })

  function toggle(roleName: string, code: string, enabled: boolean) {
    setDraft(current =>
      (current ?? data.roles).map(role =>
        role.name !== roleName
          ? role
          : { ...role, permissions: enabled ? [...role.permissions, code] : role.permissions.filter(item => item !== code) },
      ),
    )
  }

  async function submit() {
    if (!draft) return
    if (await save.run(draft)) {
      setDraft(null)
      onSaved()
    }
  }

  const actions = !can(PERMISSIONS.ROLES_EDIT) ? null : editing ? (
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
    <Button variant="secondary" onClick={() => setDraft(data.roles)}>
      Edit permissions
    </Button>
  )

  return (
    <section>
      <SectionHeader title="Capabilities by role" description="Changes apply at each user's next sign-in." actions={actions} />
      {save.error && (
        <div className="mb-4">
          <Alert>{save.error}</Alert>
        </div>
      )}
      <PermissionMatrix roles={roles} permissions={permissionCatalog(data)} editing={editing} onToggle={toggle} />
    </section>
  )
}
