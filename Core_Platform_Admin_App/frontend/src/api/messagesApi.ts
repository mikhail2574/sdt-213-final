import { request } from './client'
import type { ContactGroup, Conversation, CursorPage, Message, SendMessageRequest } from '../types/api'

export const messagesApi = {
  /** Newest conversations first, each with its latest messages. */
  conversations: () => request<CursorPage<Conversation>>('/conversations'),

  /** Older messages of one conversation, newest first. */
  history: (id: number, before: number) =>
    request<CursorPage<Message>>(`/conversations/${id}/messages`, { params: { before } }),

  /** Reply with `conversation_id`, write to a person with `recipient_id`, or to an office or course with `group_code`. */
  send: (payload: SendMessageRequest) => request<Message>('/messages', { method: 'POST', body: payload }),

  /** Offices everyone can write to, plus the course groups the user belongs to. */
  groups: () => request<ContactGroup[]>('/groups'),
}
