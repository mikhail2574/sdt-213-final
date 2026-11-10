import { useState, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import useAuth from '../../auth/useAuth'
import { startPath } from '../../auth/startPath'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import AuthHeading from './AuthHeading'
import AuthLink from './AuthLink'
import DemoAccounts from './DemoAccounts'

/** UC1 Sign in: one sign-in page for every role (FR1). Lockout (423) and inactive (403) messages come from the API. */
export default function LoginPage() {
  const { login, flash } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const signIn = useAction(login)

  async function submit(event: FormEvent) {
    event.preventDefault()
    const user = await signIn.run(email, password)
    if (!user) return
    const from = (location.state as { from?: string } | null)?.from
    navigate(from && from !== '/' ? from : startPath(user), { replace: true })
  }

  return (
    <>
      <AuthHeading title="Sign in" description="One account for courses, registration, timetables and admissions." />
      <form onSubmit={submit} className="flex flex-col gap-5">
        {flash && !signIn.error && <Alert tone="info">{flash}</Alert>}
        <Field label="Email address">
          <Input type="email" autoComplete="username" required value={email} onChange={e => setEmail(e.target.value)} />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            required
            value={password}
            onChange={e => setPassword(e.target.value)}
          />
        </Field>
        {signIn.error && <Alert>{signIn.error}</Alert>}
        <Button type="submit" variant="primary" className="mt-2 w-full" busy={signIn.busy} busyText="Signing in…">
          Sign in
        </Button>
        <div className="flex flex-wrap justify-between gap-2">
          <AuthLink to="/forgot-password">Forgot password?</AuthLink>
          <AuthLink to="/register">Create applicant account</AuthLink>
        </div>
      </form>
      <DemoAccounts
        onSelect={(demoEmail, demoPassword) => {
          setEmail(demoEmail)
          setPassword(demoPassword)
          signIn.setError('')
        }}
      />
    </>
  )
}
