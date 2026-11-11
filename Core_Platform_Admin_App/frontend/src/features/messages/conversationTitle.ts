import type { Conversation } from '../../types/api'
import type { Contact } from './useContacts'

/** The other person of a private conversation; group threads have none. */
export function otherUserId(conversation: Conversation, myId: number): number | null {
  if (conversation.group_code) return null
  return conversation.first_user === myId ? conversation.second_user : conversation.first_user
}

/** Group threads have a title; private conversations are named after the other person. */
export function conversationTitle(conversation: Conversation, myId: number, contacts: Map<number, Contact>): string {
  if (conversation.title) return conversation.title
  const other = otherUserId(conversation, myId)
  return (other !== null && contacts.get(other)?.name) || 'Private conversation'
}

export function lastMessage(conversation: Conversation) {
  return conversation.messages.at(-1)
}
