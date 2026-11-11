import { useState, type FormEvent } from 'react'
import { usersApi } from '../../api/usersApi'
import useAuth from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { changedFields } from '../../lib/collections'
import { STATUSES } from '../../lib/constants'
import { PERMISSIONS } from '../../lib/permissions'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import type { AccountStatus, ConsoleAccess, Role, User } from '../../types/api'
import DialogActions from './DialogActions'
import RoleFields from './RoleFields'

interface UserDetailsDialogProps {
  user: User
  onClose: () => void
  onSaved: (message: string) => void
}

/**
 * FR12 edit details, FR13 status, FR20 role (administrators only), FR14 password reset link.
 * Operators see the role fields disabled; viewers see everything read-only.
 */
export default function UserDetailsDialog({ user, onClose, onSaved }: UserDetailsDialogProps) {
  const { can } = useAuth()
  const canEdit = can(PERMISSIONS.USERS_EDIT)
  // Only administrators (the role holding roles.manage) may change roles and console access.
  const canAssignRoles = can(PERMISSIONS.ROLES_MANAGE)
  const canReset = can(PERMISSIONS.USERS_EDIT)

  const original = {
    name: user.name,
    role: user.role,
    console_access: (user.console_access ?? '') as ConsoleAccess | '',
    department: user.department ?? '',
    status: user.status ?? 'Active',
  }
  const [form, setForm] = useState(original)
  const update = (changes: Partial<typeof original>) => setForm(previous => ({ ...previous, ...changes }))

  const save = useAction(async () => {
    const changes = changedFields(original, form)
    if (!canAssignRoles) {
      delete changes.role
      delete changes.console_access
    }
    if (Object.keys(changes).length === 0) return true
    const { console_access, ...rest } = changes
    await usersApi.update(user.id, {
      ...rest,
      ...(console_access !== undefined ? { console_access: console_access || null } : {}),
    })
    return true
  })
  const reset = useAction(() => usersApi.sendPasswordReset(user.email))

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await save.run()) onSaved(`${form.name} was updated.`)
  }

  async function sendReset() {
    const result = await reset.run()
    if (result !== undefined) onSaved(`A password reset link was sent to ${user.email}.`)
  }

  return (
    <Modal title={user.name} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <fieldset disabled={!canEdit} className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Full name">
              <Input required minLength={2} maxLength={120} value={form.name} onChange={e => update({ name: e.target.value })} />
            </Field>
            <Field label="Email address">
              <Input value={user.email} readOnly />
            </Field>
          </div>
          <RoleFields
            role={form.role}
            consoleAccess={form.console_access}
            disabled={!canAssignRoles}
            onChange={(role: Role, console_access) => update({ role, console_access })}
          />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Department">
              <Input maxLength={100} value={form.department} onChange={e => update({ department: e.target.value })} />
            </Field>
            <Field label="Status">
              <Select options={STATUSES} value={form.status} onChange={e => update({ status: e.target.value as AccountStatus })} />
            </Field>
          </div>
        </fieldset>
        {canEdit && <p className="text-xs text-muted">Changing the role or status signs the user out of every session. Changes are recorded in the activity log.</p>}
        {(save.error || reset.error) && <Alert>{save.error || reset.error}</Alert>}
        <DialogActions
          start={
            canReset && (
              <Button variant="secondary" onClick={() => void sendReset()} busy={reset.busy} busyText="Sending…">
                Send password reset
              </Button>
            )
          }
        >
          <Button variant="quiet" onClick={onClose}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button type="submit" variant="primary" busy={save.busy} busyText="Saving…">
              Save
            </Button>
          )}
        </DialogActions>
      </form>
    </Modal>
  )
}
