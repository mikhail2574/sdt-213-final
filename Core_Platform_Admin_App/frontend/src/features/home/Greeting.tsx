import { useCurrentUser } from '../../auth/useAuth'
import { firstName, greeting } from '../../lib/format'

export default function Greeting() {
  const user = useCurrentUser()
  return (
    <p className="-mt-5 mb-10 text-muted">
      {greeting()}, {firstName(user)}. You are signed in to every module below.
    </p>
  )
}
