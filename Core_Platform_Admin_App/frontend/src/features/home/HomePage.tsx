import { ANNOUNCEMENT_CATEGORY } from '../../lib/constants'
import SectionHeader from '../../components/ui/SectionHeader'
import NotificationList from '../notifications/NotificationList'
import useNotifications from '../notifications/useNotifications'
import Greeting from './Greeting'
import ModuleTiles from './ModuleTiles'

const FEED_SIZE = 3

/** Portal home: module tiles, then university announcements and the latest notifications. */
export default function HomePage() {
  const { items } = useNotifications()
  const announcements = items.filter(item => item.category === ANNOUNCEMENT_CATEGORY).slice(0, FEED_SIZE)
  const latest = items.filter(item => item.category !== ANNOUNCEMENT_CATEGORY).slice(0, FEED_SIZE)

  return (
    <>
      <Greeting />
      <ModuleTiles />
      <div className="mt-14 grid gap-12 lg:grid-cols-2">
        <section>
          <SectionHeader title="Announcements" />
          <NotificationList items={announcements} emptyMessage="No announcements yet." />
        </section>
        <section>
          <SectionHeader title="Latest notifications" />
          <NotificationList items={latest} emptyMessage="You are all caught up." />
        </section>
      </div>
    </>
  )
}
