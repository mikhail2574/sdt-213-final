import useAuth, { useCurrentUser } from '../../auth/useAuth'
import { CONSOLE_NAV } from '../../layouts/navigation'
import Tile from './Tile'

/** Staff members with Operator or Viewer access get an Admin Console tile. */
export default function ConsoleTile() {
  const user = useCurrentUser()
  const { can } = useAuth()
  const firstPage = CONSOLE_NAV.find(item => !item.permission || can(item.permission))
  if (!firstPage) return null

  return <Tile title="Admin console" description={user.console_access ? `${user.console_access} access` : undefined} to={firstPage.to} />
}
