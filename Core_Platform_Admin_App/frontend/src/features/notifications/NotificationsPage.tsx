import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Loader from '../../components/ui/Loader'
import SectionHeader from '../../components/ui/SectionHeader'
import EmailPreferences from './EmailPreferences'
import NotificationList from './NotificationList'
import useNotifications from './useNotifications'

/** UC13 View notifications (FR23, FR24): messages from every module in one list. */
export default function NotificationsPage() {
  const { items, unreadCount, hasMore, loading, error, loadMore, markRead } = useNotifications()
  const markAll = useAction(() => markRead([]))
  const older = useAction(loadMore)

  return (
    <div className="grid items-start gap-14 lg:grid-cols-[1.7fr_1fr]">
      <section>
        <SectionHeader
          title={unreadCount ? `${unreadCount} unread` : 'All read'}
          actions={
            unreadCount > 0 && (
              <Button variant="quiet" onClick={() => void markAll.run()} busy={markAll.busy} busyText="Marking…">
                Mark all as read
              </Button>
            )
          }
        />
        {(error || markAll.error || older.error) && <Alert>{markAll.error || older.error || error}</Alert>}
        {loading && items.length === 0 ? <Loader /> : <NotificationList items={items} emptyMessage="You have no notifications." />}
        {hasMore && (
          <div className="mt-4">
            <Button variant="quiet" onClick={() => void older.run()} busy={older.busy} busyText="Loading…">
              Show older
            </Button>
          </div>
        )}
      </section>
      <EmailPreferences />
    </div>
  )
}
