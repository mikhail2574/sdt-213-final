import useAuth, { useCurrentUser } from '../../auth/useAuth'
import EmptyState from '../../components/ui/EmptyState'
import ConsoleTile from './ConsoleTile'
import ModuleTileCard from './ModuleTileCard'

/** Tiles come from GET /me `modules`; disabled modules are not returned (FR30). */
export default function ModuleTiles() {
  const user = useCurrentUser()
  const { hasConsoleAccess } = useAuth()
  const modules = user.modules ?? []
  const showConsole = hasConsoleAccess && user.role !== 'Administrator'

  if (modules.length === 0 && !showConsole) {
    return <EmptyState message="No connected modules are available for your role right now." />
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {modules.map(module => (
        <ModuleTileCard key={module.code} module={module} />
      ))}
      {showConsole && <ConsoleTile />}
    </div>
  )
}
