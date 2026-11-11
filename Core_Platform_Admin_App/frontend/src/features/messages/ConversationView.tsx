import { useEffect, useRef, useState } from 'react'
import { messagesApi } from '../../api/messagesApi'
import { useCurrentUser } from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import type { Conversation, Message } from '../../types/api'
import { conversationTitle, otherUserId } from './conversationTitle'
import MessageBubble from './MessageBubble'
import ReplyForm from './ReplyForm'
import type { Contact } from './useContacts'

/** The conversation list includes at most this many latest messages per conversation. */
const PREVIEW_SIZE = 20

interface ConversationViewProps {
  conversation: Conversation
  contacts: Map<number, Contact>
  onSent: () => void
}

/** Shows the latest messages of a conversation; older ones are loaded on request. Render with `key={conversation.id}`. */
export default function ConversationView({ conversation, contacts, onSent }: ConversationViewProps) {
  const me = useCurrentUser()
  const bottom = useRef<HTMLDivElement>(null)
  const [earlier, setEarlier] = useState<Message[]>([])
  const [hasEarlier, setHasEarlier] = useState(conversation.messages.length >= PREVIEW_SIZE)
  const other = otherUserId(conversation, me.id)
  const role = other !== null ? contacts.get(other)?.role : undefined
  const latestIds = new Set(conversation.messages.map(message => message.id))
  const messages = [...earlier.filter(message => !latestIds.has(message.id)), ...conversation.messages]
  const group = Boolean(conversation.group_code)

  const loadEarlier = useAction(async () => {
    const oldest = messages[0]
    const page = await messagesApi.history(conversation.id, oldest.id)
    setEarlier(previous => [...[...page.items].reverse(), ...previous])
    setHasEarlier(page.has_more)
  })

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: 'nearest' })
  }, [conversation.messages.length])

  return (
    <div className="flex min-h-[420px] flex-col">
      <p className="pb-4 font-semibold">
        {conversationTitle(conversation, me.id, contacts)}
        {role && <span className="ml-2 text-sm font-normal text-muted">{role}</span>}
      </p>
      <div className="flex max-h-[60vh] flex-1 flex-col gap-4 overflow-y-auto">
        {hasEarlier && (
          <div className="text-center">
            <Button variant="quiet" onClick={() => void loadEarlier.run()} busy={loadEarlier.busy} busyText="Loading…">
              Show earlier messages
            </Button>
          </div>
        )}
        {loadEarlier.error && <Alert>{loadEarlier.error}</Alert>}
        {messages.length === 0 ? (
          <EmptyState message="No messages yet." />
        ) : (
          messages.map(message => (
            <MessageBubble
              key={message.id}
              message={message}
              mine={message.sender_id === me.id}
              senderName={group ? contacts.get(message.sender_id)?.name : undefined}
            />
          ))
        )}
        <div ref={bottom} />
      </div>
      <ReplyForm conversationId={conversation.id} onSent={onSent} />
    </div>
  )
}
