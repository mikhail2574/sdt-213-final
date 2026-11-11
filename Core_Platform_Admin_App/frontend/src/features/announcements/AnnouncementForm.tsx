import { useState, type FormEvent } from 'react'
import { notificationsApi } from '../../api/notificationsApi'
import useAction from '../../hooks/useAction'
import { ANNOUNCEMENT_CATEGORY, CHANNELS, ROLES } from '../../lib/constants'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import Textarea from '../../components/form/Textarea'
import type { Channel } from '../../types/api'
import { AUDIENCE_KINDS, buildAudience, type AudienceKind } from './audience'

const EMPTY = { kind: 'ALL' as AudienceKind, target: 'Student', channel: 'in_app_email' as Channel, title: '', text: '' }

/** UC14 Send announcement: one POST /notifications with an audience; the server creates a notification per recipient. */
export default function AnnouncementForm({ onSent }: { onSent: () => void }) {
  const [form, setForm] = useState(EMPTY)
  const [sent, setSent] = useState(false)
  const send = useAction(notificationsApi.send)

  const update = (changes: Partial<typeof EMPTY>) => {
    setForm(previous => ({ ...previous, ...changes }))
    setSent(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const result = await send.run({
      title: form.title.trim(),
      text: form.text.trim(),
      category: ANNOUNCEMENT_CATEGORY,
      channel: form.channel,
      audience: buildAudience(form.kind, form.target),
    })
    if (result === undefined) return
    setForm(EMPTY)
    setSent(true)
    onSent()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Audience">
          <Select
            options={AUDIENCE_KINDS}
            value={form.kind}
            onChange={e => {
              const kind = e.target.value as AudienceKind
              update({ kind, target: kind === 'ROLE' ? 'Student' : '' })
            }}
          />
        </Field>
        <Field label="Channel">
          <Select options={CHANNELS} value={form.channel} onChange={e => update({ channel: e.target.value as Channel })} />
        </Field>
      </div>
      {form.kind === 'ROLE' && (
        <Field label="Role">
          <Select options={ROLES} value={form.target} onChange={e => update({ target: e.target.value })} />
        </Field>
      )}
      {form.kind === 'DEPARTMENT' && (
        <Field label="Department">
          <Input required maxLength={100} placeholder="e.g. Computer Science" value={form.target} onChange={e => update({ target: e.target.value })} />
        </Field>
      )}
      <Field label="Title">
        <Input required maxLength={150} value={form.title} onChange={e => update({ title: e.target.value })} />
      </Field>
      <Field label="Message">
        <Textarea required rows={5} maxLength={4000} value={form.text} onChange={e => update({ text: e.target.value })} />
      </Field>
      {send.error && <Alert>{send.error}</Alert>}
      {sent && <Alert tone="success">Announcement sent.</Alert>}
      <div>
        <Button type="submit" variant="primary" busy={send.busy} busyText="Sending…">
          Send
        </Button>
      </div>
    </form>
  )
}
