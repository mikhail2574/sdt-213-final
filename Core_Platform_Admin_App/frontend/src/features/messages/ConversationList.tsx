import { useCurrentUser } from '../../auth/useAuth'
import EmptyState from '../../components/ui/EmptyState'
import type { Conversation } from '../../types/api'
import { conversationTitle, lastMessage } from './conversationTitle'
import type { Contact } from './useContacts'

interface ConversationListProps {
  conversations: Conversation[]
  contacts: Map<number, Contact>
  selectedId: number | null
  onSelect: (id: number) => void
}

export default function ConversationList({ conversations, contacts, selectedId, onSelect }: ConversationListProps) {
  const me = useCurrentUser()
  if (conversations.length === 0) return <EmptyState message="No conversations yet." />

  return (
    <ul className="flex flex-col gap-1">
      {conversations.map(conversation => {
        const selected = conversation.id === selectedId
        return (
          <li key={conversation.id}>
            <button
              type="button"
              onClick={() => onSelect(conversation.id)}
              aria-current={selected ? 'true' : undefined}
              className={`w-full rounded-xl px-4 py-3 text-left ${selected ? 'bg-lilac' : 'hover:bg-surface'}`}
            >
              <span className="block truncate text-sm font-semibold">{conversationTitle(conversation, me.id, contacts)}</span>
              <span className="block truncate text-sm text-muted">{lastMessage(conversation)?.text ?? ''}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
