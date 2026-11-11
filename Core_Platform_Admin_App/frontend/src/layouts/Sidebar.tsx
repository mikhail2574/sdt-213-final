import useAuth from '../auth/useAuth'
import Brand from '../components/Brand'
import useNotifications from '../features/notifications/useNotifications'
import NavGroup from './NavGroup'
import SidebarUser from './SidebarUser'
import { CONSOLE_NAV, PORTAL_NAV, type NavItem } from './navigation'

export default function Sidebar() {
  const { can } = useAuth()
  const { unreadCount } = useNotifications()
  const allowed = (item: NavItem) => !item.permission || can(item.permission)

  return (
    <aside className="flex shrink-0 flex-col gap-6 px-4 py-5 md:sticky md:top-0 md:h-screen md:w-60 md:overflow-y-auto md:py-8">
      <div className="px-3">
        <Brand />
      </div>
      <nav aria-label="Main navigation" className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        <NavGroup items={PORTAL_NAV.filter(allowed)} counts={{ '/notifications': unreadCount }} />
        <NavGroup heading="Admin console" items={CONSOLE_NAV.filter(allowed)} />
      </nav>
      <div className="md:mt-auto">
        <SidebarUser />
      </div>
    </aside>
  )
}
