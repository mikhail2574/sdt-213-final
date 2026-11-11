import { useState, type FormEvent } from 'react'
import { messagesApi } from '../../api/messagesApi'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'

interface ReplyFormProps {
  conversationId: number
  onSent: () => void
}

export default function ReplyForm({ conversationId, onSent }: ReplyFormProps) {
  const [text, setText] = useState('')
  const send = useAction(messagesApi.send)

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (!text.trim()) return
    const result = await send.run({ conversation_id: conversationId, text: text.trim() })
    if (result === undefined) return
    setText('')
    onSent()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 pt-4">
      {send.error && <Alert>{send.error}</Alert>}
      <div className="flex gap-3">
        <div className="flex-1">
          <Field label="Write a reply" hideLabel>
            <Input placeholder="Write a reply" maxLength={4000} value={text} onChange={e => setText(e.target.value)} />
          </Field>
        </div>
        <Button type="submit" variant="primary" busy={send.busy} busyText="Sending…" disabled={!text.trim()}>
          Send
        </Button>
      </div>
    </form>
  )
}
