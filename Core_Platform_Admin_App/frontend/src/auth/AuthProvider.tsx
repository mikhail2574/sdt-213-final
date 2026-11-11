import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AuthContext, type AuthContextValue, type AuthStatus } from './AuthContext'
import { authApi } from '../api/authApi'
import { meApi } from '../api/meApi'
import { ApiError, setUnauthorizedHandler, tokenStore } from '../api/client'
import { CONSOLE_PERMISSIONS, resolvePermissions, type Permission } from '../lib/permissions'
import type { Me } from '../types/api'

const SESSION_EXPIRED = 'Your session has expired. Please sign in again.'

export default function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<Me | null>(null)
  const [status, setStatus] = useState<AuthStatus>(() => (tokenStore.get() ? 'loading' : 'anonymous'))
  const [flash, setFlash] = useState('')
  const generation = useRef(0)

  const endSession = useCallback((message = '') => {
    generation.current++
    tokenStore.clear()
    setUser(null)
    setStatus('anonymous')
    setFlash(message)
  }, [])

  const refreshUser = useCallback(async () => {
    const started = generation.current
    const me = await meApi.get()
    if (started === generation.current) {
      setUser(me)
      setStatus('authenticated')
    }
    return me
  }, [])

  const signInWithToken = useCallback(
    async (token: string) => {
      generation.current++
      tokenStore.set(token)
      setFlash('')
      return refreshUser()
    },
    [refreshUser],
  )

  const login = useCallback(
    async (email: string, password: string) => {
      const { access_token } = await authApi.login(email, password)
      // /me carries permissions and module tiles, which the login response does not.
      return signInWithToken(access_token)
    },
    [signInWithToken],
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } catch (error) {
      // 401 means the server session is already gone; anything else is a real failure.
      if (!(error instanceof ApiError && error.status === 401)) throw error
    }
    endSession()
  }, [endSession])

  // Any 401 on an authenticated request (expired or revoked session, NFR7) signs the user out.
  useEffect(() => {
    setUnauthorizedHandler(() => endSession(SESSION_EXPIRED))
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // Restore the session from a stored token on page load.
  useEffect(() => {
    const started = generation.current
    if (tokenStore.get()) refreshUser().catch(() => { if (started === generation.current) endSession() })
  }, [refreshUser, endSession])

  const value = useMemo<AuthContextValue>(() => {
    const permissions = resolvePermissions(user)
    const can = (permission: Permission) => permissions.has(permission)
    return {
      user,
      status,
      flash,
      can,
      hasConsoleAccess: CONSOLE_PERMISSIONS.some(can),
      login,
      signInWithToken,
      logout,
      endSession,
      refreshUser,
      setUser,
    }
  }, [user, status, flash, login, signInWithToken, logout, endSession, refreshUser])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
