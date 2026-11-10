import { Navigate, Outlet } from 'react-router-dom'
import useAuth from './useAuth'
import type { Permission } from '../lib/permissions'

/** FR7: routes the user is not allowed to open redirect to their start page. */
export default function RequirePermission({ permission }: { permission: Permission }) {
  const { can } = useAuth()
  return can(permission) ? <Outlet /> : <Navigate to="/" replace />
}
