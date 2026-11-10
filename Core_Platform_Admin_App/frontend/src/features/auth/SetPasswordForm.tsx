import { useState, type FormEvent } from 'react'
import { authApi } from '../../api/authApi'
import useAction from '../../hooks/useAction'
import { PASSWORD_HINT, validateNewPassword } from '../../lib/password'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import AuthLink from './AuthLink'

/** Sets a new password from a reset link (UC2) or an invitation link (FR11). */
export default function SetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [done, setDone] = useState(false)
  const save = useAction(authApi.emailLink)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const passwordError = validateNewPassword(password, confirmation)
    if (passwordError) {
      save.setError(passwordError)
      return
    }
    const result = await save.run(token, password)
    if (result !== undefined) setDone(true)
  }

  if (done) {
    return (
      <div className="flex flex-col gap-6">
        <Alert tone="success">Your password is set. Sign in with your new password.</Alert>
        <AuthLink to="/login">Go to sign in</AuthLink>
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <Field label="New password" hint={PASSWORD_HINT}>
        <Input type="password" required autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} />
      </Field>
      <Field label="Repeat new password">
        <Input
          type="password"
          required
          autoComplete="new-password"
          value={confirmation}
          onChange={e => setConfirmation(e.target.value)}
        />
      </Field>
      {save.error && <Alert>{save.error}</Alert>}
      <Button type="submit" variant="primary" className="w-full" busy={save.busy} busyText="Saving…">
        Set password
      </Button>
      <AuthLink to="/forgot-password">Request a new link</AuthLink>
    </form>
  )
}
