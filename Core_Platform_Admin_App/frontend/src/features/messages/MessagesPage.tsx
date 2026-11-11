import { useEffect, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { messagesApi } from '../../api/messagesApi'
import useAuth from '../../auth/useAuth'
import useAsync from '../../hooks/useAsync'
import { PERMISSIONS } from '../../lib/permissions'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import ConversationList from './ConversationList'
import ConversationView from './ConversationView'
import NewMessageDialog from './NewMessageDialog'
import type { Recipient } from './RecipientPicker'
import type { MessagesLocationState } from './messagesLocationState'
import useContacts from './useContacts'

/** UC15 Send message (FR26): conversations on the left, the selected one on the right. */
export default function MessagesPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { can } = useAuth()
  const conversations = useAsync(messagesApi.conversations, [])
  const contacts = useContacts(can([PERMISSIONS.DIRECTORY_VIEW, PERMISSIONS.USERS_VIEW]))
  const [selectedId, setSelectedId] = useState<number | null>(null)
  /** Conversation to select as soon as a reload returns it (a newly started one). */
  const [preferredId, setPreferredId] = useState<number | null>(null)
  const [composer, setComposer] = useState<{ recipient?: Recipient } | null>(null)

  // "Message" in the directory opens the composer with that person preselected.
  useEffect(() => {
    const contact = (location.state as MessagesLocationState | null)?.recipient
    if (!contact) return
    setComposer({ recipient: { kind: 'person', contact } })
    navigate(location.pathname, { replace: true, state: null })
  }, [location.state, location.pathname, navigate])

  // Keep a valid selection after every (re)load.
  const list = conversations.data?.items ?? []
  useEffect(() => {
    if (list.length === 0) return
    if (preferredId !== null && list.some(conversation => conversation.id === preferredId)) {
      setSelectedId(preferredId)
      setPreferredId(null)
    } else if (!list.some(conversation => conversation.id === selectedId)) {
      setSelectedId(list[0].id)
    }
  }, [list, selectedId, preferredId])

  const selected = list.find(conversation => conversation.id === selectedId)

  return (
    <>
      <div className="-mt-4 mb-8">
        <Button variant="primary" onClick={() => setComposer({})}>
          New message
        </Button>
      </div>
      <AsyncView state={conversations} loadingLabel="Loading conversations…">
        {() => (
          <div className="grid gap-10 md:grid-cols-[minmax(220px,1fr)_2fr]">
            <ConversationList conversations={list} contacts={contacts.byId} selectedId={selectedId} onSelect={setSelectedId} />
            {selected ? (
              <ConversationView key={selected.id} conversation={selected} contacts={contacts.byId} onSent={conversations.reload} />
            ) : (
              <EmptyState message="Select a conversation or start a new one." />
            )}
          </div>
        )}
      </AsyncView>
      {composer && (
        <NewMessageDialog
          initialRecipient={composer.recipient}
          onClose={() => setComposer(null)}
          onSent={(message, recipient) => {
            if (recipient.kind === 'person') contacts.remember(recipient.contact)
            setComposer(null)
            if (message.conversation_id) setPreferredId(message.conversation_id)
            conversations.reload()
          }}
        />
      )}
    </>
  )
}
