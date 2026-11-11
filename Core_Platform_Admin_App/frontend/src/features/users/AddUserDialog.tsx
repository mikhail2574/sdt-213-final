import { useState, type FormEvent } from 'react'
import { usersApi } from '../../api/usersApi'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import type { ConsoleAccess, Role } from '../../types/api'
import DialogActions from './DialogActions'
import RoleFields from './RoleFields'

interface AddUserDialogProps {
  onClose: () => void
  onCreated: (name: string) => void
}

const INITIAL = {
  name: '',
  email: '',
  role: 'Faculty' as Role,
  console_access: '' as ConsoleAccess | '',
  department: '',
}

/** FR11: creates a Pending account; the user activates it from the invitation email by setting a password. */
export default function AddUserDialog({ onClose, onCreated }: AddUserDialogProps) {
  const [form, setForm] = useState(INITIAL)
  const create = useAction(usersApi.create)
  const update = (changes: Partial<typeof INITIAL>) => setForm(previous => ({ ...previous, ...changes }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = await create.run({
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      department: form.department.trim() || undefined,
      ...(form.console_access ? { console_access: form.console_access } : {}),
    })
    if (result !== undefined) onCreated(form.name.trim())
  }

  return (
    <Modal title="Add a user" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Full name">
          <Input required minLength={2} maxLength={120} value={form.name} onChange={e => update({ name: e.target.value })} />
        </Field>
        <Field label="Email address">
          <Input type="email" required maxLength={255} value={form.email} onChange={e => update({ email: e.target.value })} />
        </Field>
        <RoleFields role={form.role} consoleAccess={form.console_access} onChange={(role, console_access) => update({ role, console_access })} />
        <Field label="Department">
          <Input maxLength={100} value={form.department} onChange={e => update({ department: e.target.value })} />
        </Field>
        {create.error && <Alert>{create.error}</Alert>}
        <DialogActions>
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={create.busy} busyText="Creating…">
            Create user
          </Button>
        </DialogActions>
      </form>
    </Modal>
  )
}
