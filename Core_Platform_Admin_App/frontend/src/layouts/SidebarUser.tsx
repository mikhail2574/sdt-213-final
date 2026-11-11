import useAuth, { useCurrentUser } from '../auth/useAuth'
import useAction from '../hooks/useAction'
import { roleLabel } from '../lib/format'

/** Signed-in user and the Sign out action (FR1). */
export default function SidebarUser() {
  const user = useCurrentUser()
  const { logout } = useAuth()
  const signOut = useAction(logout)

  return (
    <div className="flex items-center justify-between gap-4 px-3 md:block">
      <div className="min-w-0">
        <p className="truncate text-sm font-semibold">{user.preferred_name || user.name}</p>
        <p className="truncate text-xs text-muted">{roleLabel(user)}</p>
      </div>
      <button
        type="button"
        onClick={() => void signOut.run()}
        disabled={signOut.busy}
        className="text-sm text-muted hover:text-ink md:mt-3"
      >
        {signOut.busy ? 'Signing out…' : 'Sign out'}
      </button>
      {signOut.error && (
        <p role="alert" className="mt-2 text-xs">
          Could not sign out: {signOut.error}
        </p>
      )}
    </div>
  )
}
