import { useContext } from 'react'
import { NotificationsContext, type NotificationsContextValue } from './NotificationsContext'

export default function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext)
  if (!context) throw new Error('useNotifications must be used inside <NotificationsProvider>')
  return context
}
