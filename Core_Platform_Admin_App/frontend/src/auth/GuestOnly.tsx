import { Navigate, Outlet } from 'react-router-dom'
import useAuth from './useAuth'

/** Sign-in, registration and password reset pages are only for signed-out visitors. */
export default function GuestOnly() {
  const { status } = useAuth()
  return status === 'authenticated' ? <Navigate to="/" replace /> : <Outlet />
}
