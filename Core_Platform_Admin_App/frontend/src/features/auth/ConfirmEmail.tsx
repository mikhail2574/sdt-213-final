import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authApi } from '../../api/authApi'
import useAuth from '../../auth/useAuth'
import { startPath } from '../../auth/startPath'
import { errorMessage } from '../../lib/format'
import Alert from '../../components/ui/Alert'
import Loader from '../../components/ui/Loader'
import AuthLink from './AuthLink'

type State = { kind: 'working' } | { kind: 'confirmed' } | { kind: 'failed'; message: string }

/** Applicant confirmation link (UC4 step 6-7): activates the account and signs the applicant in when a token is returned. */
export default function ConfirmEmail({ token }: { token: string }) {
  const { signInWithToken } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<State>({ kind: 'working' })
  // Links are single-use: make sure StrictMode's double effect does not submit twice.
  const submitted = useRef(false)

  useEffect(() => {
    if (submitted.current) return
    submitted.current = true
    authApi
      .emailLink(token)
      .then(async response => {
        if ('access_token' in response) {
          const user = await signInWithToken(response.access_token)
          navigate(startPath(user), { replace: true })
        } else {
          setState({ kind: 'confirmed' })
        }
      })
      .catch(error => setState({ kind: 'failed', message: errorMessage(error) }))
  }, [token, signInWithToken, navigate])

  if (state.kind === 'working') return <Loader label="One moment…" />

  return (
    <div className="flex flex-col gap-6">
      {state.kind === 'confirmed' ? (
        <Alert tone="success">Your email is confirmed. You can sign in now.</Alert>
      ) : (
        <Alert>{state.message}</Alert>
      )}
      <AuthLink to="/login">Go to sign in</AuthLink>
    </div>
  )
}
