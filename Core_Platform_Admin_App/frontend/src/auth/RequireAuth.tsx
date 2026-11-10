import { Navigate, Outlet, useLocation } from 'react-router-dom'
import useAuth from './useAuth'
import Loader from '../components/ui/Loader'

/** Renders child routes only for signed-in users; others go to the sign-in page. */
export default function RequireAuth() {
  const { status } = useAuth()
  const location = useLocation()

  if (status === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center">
        <Loader label="Loading Core Platform…" />
      </div>
    )
  }
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
