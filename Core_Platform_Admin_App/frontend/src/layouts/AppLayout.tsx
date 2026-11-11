import { Outlet } from 'react-router-dom'
import NotificationsProvider from '../features/notifications/NotificationsProvider'
import PageTitle from './PageTitle'
import Sidebar from './Sidebar'

/** Same layout and navigation on every signed-in page (NFR1). */
export default function AppLayout() {
  return (
    <NotificationsProvider>
      <div className="flex min-h-screen flex-col md:flex-row">
        <Sidebar />
        <main className="w-full max-w-6xl min-w-0 px-4 pt-6 pb-20 sm:px-8 md:pt-10 lg:px-14">
          <PageTitle />
          <Outlet />
        </main>
      </div>
    </NotificationsProvider>
  )
}
