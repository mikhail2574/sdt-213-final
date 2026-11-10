import { Navigate } from 'react-router-dom'
import { useCurrentUser } from './useAuth'
import { startPath } from './startPath'

export default function StartRedirect() {
  const user = useCurrentUser()
  return <Navigate to={startPath(user)} replace />
}
