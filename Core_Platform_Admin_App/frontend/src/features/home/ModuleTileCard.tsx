import { authApi } from '../../api/authApi'
import useAction from '../../hooks/useAction'
import { moduleDescription } from '../../lib/modules'
import type { ModuleLink } from '../../types/api'
import Tile from './Tile'

/**
 * One connected module (FR2). Opening it requests a one-time sign-in ticket, so the module
 * starts with the same account without asking for the password again.
 */
export default function ModuleTileCard({ module }: { module: ModuleLink }) {
  const launch = useAction(async () => {
    const { launch_url } = await authApi.moduleTicket(module.code)
    window.location.assign(launch_url)
  })

  return (
    <Tile
      title={module.name}
      description={launch.busy ? 'Opening…' : moduleDescription(module.code)}
      footer={launch.error || null}
      onClick={() => void launch.run()}
      disabled={launch.busy}
    />
  )
}
