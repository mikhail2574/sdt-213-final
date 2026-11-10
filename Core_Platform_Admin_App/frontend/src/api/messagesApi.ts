import { request } from './client'
import { toList, type ListResponse } from '../lib/collections'
import type { Conversation, SendMessageRequest, SendMessageResponse } from '../types/api'

export const messagesApi = {
  /** Conversations together with their messages. */
  conversations: () => request<ListResponse<Conversation>>('/conversations').then(toList),

  /** Reply with `conversation_id` or start a new conversation with `recipient_id`. */
  send: (payload: SendMessageRequest) =>
    request<SendMessageResponse | null>('/messages', { method: 'POST', body: payload }),
}
