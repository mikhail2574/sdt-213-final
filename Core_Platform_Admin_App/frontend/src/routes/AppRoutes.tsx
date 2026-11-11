import { Navigate, Route, Routes } from 'react-router-dom'
import GuestOnly from '../auth/GuestOnly'
import RequireAuth from '../auth/RequireAuth'
import RequirePermission from '../auth/RequirePermission'
import StartRedirect from '../auth/StartRedirect'
import AppLayout from '../layouts/AppLayout'
import AuthLayout from '../layouts/AuthLayout'
import { PERMISSIONS as P } from '../lib/permissions'
import AnnouncementsPage from '../features/announcements/AnnouncementsPage'
import AuditLogPage from '../features/audit/AuditLogPage'
import EmailLinkPage from '../features/auth/EmailLinkPage'
import ForgotPasswordPage from '../features/auth/ForgotPasswordPage'
import LoginPage from '../features/auth/LoginPage'
import RegisterPage from '../features/auth/RegisterPage'
import DashboardPage from '../features/dashboard/DashboardPage'
import DirectoryPage from '../features/directory/DirectoryPage'
import HomePage from '../features/home/HomePage'
import MessagesPage from '../features/messages/MessagesPage'
import NotificationsPage from '../features/notifications/NotificationsPage'
import ProfilePage from '../features/profile/ProfilePage'
import ReportsPage from '../features/reports/ReportsPage'
import RolesPage from '../features/roles/RolesPage'
import SettingsPage from '../features/settings/SettingsPage'
import SystemStatusPage from '../features/status/SystemStatusPage'
import UsersPage from '../features/users/UsersPage'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<AuthLayout />}>
        <Route element={<GuestOnly />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        </Route>
        <Route path="/email-link" element={<EmailLinkPage />} />
      </Route>

      <Route element={<RequireAuth />}>
        <Route element={<AppLayout />}>
          <Route index element={<StartRedirect />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage />} />

          <Route element={<RequirePermission permission={P.MESSAGES_SEND} />}>
            <Route path="/messages" element={<MessagesPage />} />
          </Route>
          <Route element={<RequirePermission permission={[P.DIRECTORY_VIEW, P.USERS_VIEW]} />}>
            <Route path="/directory" element={<DirectoryPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.ANNOUNCEMENTS_SEND} />}>
            <Route path="/announcements" element={<AnnouncementsPage />} />
          </Route>
          <Route element={<RequirePermission permission={P.REPORTS_VIEW} />}>
            <Route path="/reports" element={<ReportsPage />} />
          </Route>

          <Route path="/admin">
            <Route element={<RequirePermission permission={P.DASHBOARD_VIEW} />}>
              <Route path="dashboard" element={<DashboardPage />} />
            </Route>
            <Route element={<RequirePermission permission={P.USERS_VIEW} />}>
              <Route path="users" element={<UsersPage />} />
            </Route>
            <Route element={<RequirePermission permission={P.USERS_VIEW} />}>
              <Route path="roles" element={<RolesPage />} />
            </Route>
            <Route element={<RequirePermission permission={P.SETTINGS_MANAGE} />}>
              <Route path="settings" element={<SettingsPage />} />
            </Route>
            <Route element={<RequirePermission permission={P.DASHBOARD_VIEW} />}>
              <Route path="status" element={<SystemStatusPage />} />
            </Route>
            <Route element={<RequirePermission permission={P.AUDIT_VIEW} />}>
              <Route path="audit" element={<AuditLogPage />} />
            </Route>
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
