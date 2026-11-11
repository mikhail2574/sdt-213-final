import { notificationsApi } from '../../api/notificationsApi'
import useAsync from '../../hooks/useAsync'
import AsyncView from '../../components/ui/AsyncView'
import SectionHeader from '../../components/ui/SectionHeader'
import useNotifications from '../notifications/useNotifications'
import AnnouncementForm from './AnnouncementForm'
import AnnouncementHistory from './AnnouncementHistory'

/** FR25: administrators and authorized staff and faculty send announcements to the audiences they may address. */
export default function AnnouncementsPage() {
  const history = useAsync(notificationsApi.announcements, [])
  const { reload: reloadInbox } = useNotifications()

  return (
    <div className="grid items-start gap-14 lg:grid-cols-[1.5fr_1fr]">
      <section>
        <SectionHeader title="New announcement" />
        <AnnouncementForm
          onSent={() => {
            history.reload()
            void reloadInbox()
          }}
        />
      </section>
      <section>
        <SectionHeader title="Sent announcements" />
        <AsyncView state={history}>{items => <AnnouncementHistory items={items} />}</AsyncView>
      </section>
    </div>
  )
}
