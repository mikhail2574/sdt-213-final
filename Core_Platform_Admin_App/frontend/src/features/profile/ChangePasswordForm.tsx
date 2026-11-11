import { useState, type FormEvent } from 'react'
import { authApi } from '../../api/authApi'
import useAuth from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { PASSWORD_HINT, validateNewPassword } from '../../lib/password'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'

const EMPTY = { current: '', next: '', confirmation: '' }

/**
 * UC3 Change password (FR4). The server revokes every session of the user,
 * including this one, so the user signs in again afterwards.
 */
export default function ChangePasswordForm() {
  const { endSession } = useAuth()
  const [form, setForm] = useState(EMPTY)
  const change = useAction(authApi.changePassword)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const passwordError = validateNewPassword(form.next, form.confirmation)
    if (passwordError) {
      change.setError(passwordError)
      return
    }
    const result = await change.run({ current_password: form.current, new_password: form.next, confirm_password: form.confirmation })
    if (result === undefined) return
    setForm(EMPTY)
    endSession('Password updated. Sign in with your new password.')
  }

  return (
    <section>
      <SectionHeader title="Change password" />
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Current password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={form.current}
            onChange={e => setForm({ ...form, current: e.target.value })}
          />
        </Field>
        <Field label="New password" hint={PASSWORD_HINT}>
          <Input type="password" autoComplete="new-password" required value={form.next} onChange={e => setForm({ ...form, next: e.target.value })} />
        </Field>
        <Field label="Repeat new password">
          <Input
            type="password"
            autoComplete="new-password"
            required
            value={form.confirmation}
            onChange={e => setForm({ ...form, confirmation: e.target.value })}
          />
        </Field>
        {change.error && <Alert>{change.error}</Alert>}
        <div>
          <Button type="submit" variant="secondary" busy={change.busy} busyText="Updating…">
            Update password
          </Button>
        </div>
      </form>
    </section>
  )
}
