import { useContext } from 'react'
import { AuthContext, type AuthContextValue } from './AuthContext'

export default function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (!context) throw new Error('useAuth must be used inside <AuthProvider>')
  return context
}

/** For components that are only rendered behind <RequireAuth>. */
export function useCurrentUser() {
  const { user } = useAuth()
  if (!user) throw new Error('useCurrentUser requires a signed-in user')
  return user
}
