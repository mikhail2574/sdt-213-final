import { ANNOUNCEMENT_CATEGORY } from '../../lib/constants'
import SectionHeader from '../../components/ui/SectionHeader'
import NotificationList from '../notifications/NotificationList'
import useNotifications from '../notifications/useNotifications'
import AnnouncementForm from './AnnouncementForm'

const HISTORY_SIZE = 6

/** FR25: administrators and authorized staff send announcements to everyone, a role or a department. */
export default function AnnouncementsPage() {
  const { items, reload } = useNotifications()
  const recent = items.filter(item => item.category === ANNOUNCEMENT_CATEGORY).slice(0, HISTORY_SIZE)

  return (
    <div className="grid items-start gap-14 lg:grid-cols-[1.5fr_1fr]">
      <section>
        <SectionHeader title="New announcement" />
        <AnnouncementForm onSent={() => void reload()} />
      </section>
      <section>
        <SectionHeader title="Recent announcements" />
        <NotificationList items={recent} emptyMessage="No announcements yet." />
      </section>
    </div>
  )
}
