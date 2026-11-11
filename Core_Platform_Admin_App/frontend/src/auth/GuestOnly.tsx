import { Navigate, Outlet } from 'react-router-dom'
import useAuth from './useAuth'
import Loader from '../components/ui/Loader'

/** Sign-in, registration and password reset pages are only for signed-out visitors. */
export default function GuestOnly() {
  const { status } = useAuth()
  if (status === 'loading') return <Loader label="Restoring session…" />
  return status === 'authenticated' ? <Navigate to="/" replace /> : <Outlet />
}
