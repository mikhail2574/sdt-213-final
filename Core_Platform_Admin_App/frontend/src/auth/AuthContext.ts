import { createContext } from 'react'
import type { Me } from '../types/api'
import type { Permission } from '../lib/permissions'

export type AuthStatus = 'loading' | 'authenticated' | 'anonymous'

export interface AuthContextValue {
  user: Me | null
  status: AuthStatus
  /** Message for the sign-in page, e.g. "Your session has expired". */
  flash: string
  /** True when the user has the permission, or any of the listed permissions. */
  can: (permission: Permission | Permission[]) => boolean
  /** True when the user may open at least one Admin Console page. */
  hasConsoleAccess: boolean
  login: (email: string, password: string) => Promise<Me>
  signInWithToken: (token: string) => Promise<Me>
  logout: () => Promise<void>
  /** Drops the local session without calling the API (after password change, 401, ...). */
  endSession: (message?: string) => void
  refreshUser: () => Promise<Me>
  setUser: (user: Me) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
