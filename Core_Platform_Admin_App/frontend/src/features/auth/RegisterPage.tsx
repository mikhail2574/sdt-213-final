import { useState, type FormEvent } from 'react'
import { authApi } from '../../api/authApi'
import useAction from '../../hooks/useAction'
import { PASSWORD_HINT, validateNewPassword } from '../../lib/password'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Checkbox from '../../components/form/Checkbox'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import AuthHeading from './AuthHeading'
import AuthLink from './AuthLink'

const EMPTY_FORM = { name: '', email: '', password: '', confirmation: '', privacyAccepted: false }

/** UC4 Register applicant account (FR6): creates a Pending applicant and sends a confirmation email. */
export default function RegisterPage() {
  const [form, setForm] = useState(EMPTY_FORM)
  const [registeredEmail, setRegisteredEmail] = useState('')
  const register = useAction(authApi.register)

  const update = (changes: Partial<typeof EMPTY_FORM>) => setForm(previous => ({ ...previous, ...changes }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    const passwordError = validateNewPassword(form.password, form.confirmation)
    if (passwordError) {
      register.setError(passwordError)
      return
    }
    if (!form.privacyAccepted) {
      register.setError('Please accept the privacy notice.')
      return
    }
    const result = await register.run({ name: form.name.trim(), email: form.email.trim(), password: form.password,
      confirm_password: form.confirmation, privacy_accepted: form.privacyAccepted })
    if (result !== undefined) setRegisteredEmail(form.email.trim())
  }

  const heading = <AuthHeading title="Create applicant account" description="Prospective students apply through the Admissions portal with this account." />

  if (registeredEmail) {
    return (
      <>
        {heading}
        <Alert tone="success">Your account was created. A confirmation email for {registeredEmail} has been queued. Open the link when it arrives to activate your account.</Alert>
        <div className="mt-6">
          <AuthLink to="/login">Back to sign in</AuthLink>
        </div>
      </>
    )
  }

  return (
    <>
      {heading}
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Full name">
          <Input required minLength={2} maxLength={120} autoComplete="name" value={form.name} onChange={e => update({ name: e.target.value })} />
        </Field>
        <Field label="Email address">
          <Input type="email" required autoComplete="email" value={form.email} onChange={e => update({ email: e.target.value })} />
        </Field>
        <div className="flex flex-col gap-5">
          <Field label="Password" hint={PASSWORD_HINT}>
            <Input type="password" required autoComplete="new-password" value={form.password} onChange={e => update({ password: e.target.value })} />
          </Field>
          <Field label="Repeat password">
            <Input
              type="password"
              required
              autoComplete="new-password"
              value={form.confirmation}
              onChange={e => update({ confirmation: e.target.value })}
            />
          </Field>
        </div>
        <Checkbox
          required
          label="I accept the privacy notice"
          checked={form.privacyAccepted}
          onChange={e => update({ privacyAccepted: e.target.checked })}
        />
        {register.error && <Alert>{register.error}</Alert>}
        <Button type="submit" variant="primary" className="w-full" busy={register.busy} busyText="Registering…">
          Register
        </Button>
        <AuthLink to="/login">Back to sign in</AuthLink>
      </form>
    </>
  )
}
