import { useState, type FormEvent } from 'react'
import { authApi } from '../../api/authApi'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import AuthHeading from './AuthHeading'
import AuthLink from './AuthLink'

/** UC2 Reset forgotten password (FR3). The confirmation is neutral so it does not reveal which emails exist. */
export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sentTo, setSentTo] = useState('')
  const sendLink = useAction(authApi.forgotPassword)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = await sendLink.run(email.trim())
    if (result !== undefined) setSentTo(email.trim())
  }

  return (
    <>
      <AuthHeading title="Reset your password" description="We will email you a link to set a new password. It is valid for 24 hours." />
      <form onSubmit={submit} className="flex flex-col gap-5">
        <Field label="Email address">
          <Input type="email" required autoComplete="username" value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        {sentTo && <Alert tone="success">If an account exists for {sentTo}, a reset link is on its way.</Alert>}
        {sendLink.error && <Alert>{sendLink.error}</Alert>}
        <Button type="submit" variant="primary" className="w-full" busy={sendLink.busy} busyText="Sending…">
          Send link
        </Button>
        <AuthLink to="/login">Back to sign in</AuthLink>
      </form>
    </>
  )
}
