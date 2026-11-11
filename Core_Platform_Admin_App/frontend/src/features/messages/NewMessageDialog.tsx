import { useState, type FormEvent } from 'react'
import { messagesApi } from '../../api/messagesApi'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Field from '../../components/form/Field'
import Textarea from '../../components/form/Textarea'
import type { Message } from '../../types/api'
import RecipientPicker, { type Recipient } from './RecipientPicker'

interface NewMessageDialogProps {
  initialRecipient?: Recipient
  onClose: () => void
  onSent: (message: Message, recipient: Recipient) => void
}

/** UC15 Send message: POST /messages to a person (recipient_id) or an office or course (group_code). */
export default function NewMessageDialog({ initialRecipient, onClose, onSent }: NewMessageDialogProps) {
  const [recipient, setRecipient] = useState<Recipient | null>(initialRecipient ?? null)
  const [text, setText] = useState('')
  const send = useAction(messagesApi.send)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!recipient) {
      send.setError('Choose a recipient.')
      return
    }
    const destination = recipient.kind === 'person' ? { recipient_id: recipient.contact.id } : { group_code: recipient.group.code }
    const message = await send.run({ ...destination, text: text.trim() })
    if (message) onSent(message, recipient)
  }

  return (
    <Modal title="New message" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-5">
        <RecipientPicker value={recipient} onChange={setRecipient} />
        <Field label="Message">
          <Textarea required maxLength={10000} value={text} onChange={e => setText(e.target.value)} />
        </Field>
        {send.error && <Alert>{send.error}</Alert>}
        <div className="flex justify-end gap-4 pt-2">
          <Button variant="quiet" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" busy={send.busy} busyText="Sending…" disabled={!text.trim()}>
            Send
          </Button>
        </div>
      </form>
    </Modal>
  )
}
