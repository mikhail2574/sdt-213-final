import { formatDateTime } from '../../lib/format'
import type { Message } from '../../types/api'

interface MessageBubbleProps {
  message: Message
  mine: boolean
  /** Shown above other people's messages in group threads. */
  senderName?: string
}

export default function MessageBubble({ message, mine, senderName }: MessageBubbleProps) {
  return (
    <div className={`flex flex-col ${mine ? 'items-end' : 'items-start'}`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${mine ? 'bg-lilac' : 'bg-sky'}`}>
        {!mine && senderName && <p className="mb-0.5 text-xs font-semibold">{senderName}</p>}
        <p className="whitespace-pre-wrap">{message.text}</p>
      </div>
      <time dateTime={message.sent_at} className="mt-1 px-1 text-xs text-muted">
        {formatDateTime(message.sent_at)}
      </time>
    </div>
  )
}
