import { useState, type FormEvent } from 'react'
import { notificationsApi } from '../../api/notificationsApi'
import { useCurrentUser } from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { ANNOUNCEMENT_CATEGORY, CHANNELS } from '../../lib/constants'
import { plural } from '../../lib/format'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import Textarea from '../../components/form/Textarea'
import type { Channel, User } from '../../types/api'
import AudienceFields from './AudienceFields'
import { audienceKinds, buildAudience, type AudienceKind } from './audience'

function emptyForm(user: User) {
  const kind = audienceKinds(user)[0].value
  return {
    kind,
    target: kind === 'DEPARTMENT' ? (user.department ?? '') : '',
    channel: 'both' as Channel,
    title: '',
    text: '',
  }
}

/** UC14 Send announcement: one POST /notifications with an audience; the server notifies every recipient. */
export default function AnnouncementForm({ onSent }: { onSent: () => void }) {
  const user = useCurrentUser()
  const [form, setForm] = useState(() => emptyForm(user))
  const [sentTo, setSentTo] = useState<number | null>(null)
  const send = useAction(notificationsApi.send)

  const update = (changes: Partial<ReturnType<typeof emptyForm>>) => {
    setForm(previous => ({ ...previous, ...changes }))
    setSentTo(null)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (form.kind !== 'ALL' && !form.target.trim()) {
      send.setError(form.kind === 'COURSE' ? 'You have no course groups to announce to.' : 'Choose who receives the announcement.')
      return
    }
    const result = await send.run({
      title: form.title.trim(),
      text: form.text.trim(),
      category: ANNOUNCEMENT_CATEGORY,
      channel: form.channel,
      audience: buildAudience(form.kind, form.target),
    })
    if (!result) return
    setForm(emptyForm(user))
    setSentTo(result.recipients)
    onSent()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5">
      <AudienceFields kind={form.kind} target={form.target} onChange={(kind: AudienceKind, target) => update({ kind, target })}>
        <Field label="Channel">
          <Select options={CHANNELS} value={form.channel} onChange={e => update({ channel: e.target.value as Channel })} />
        </Field>
      </AudienceFields>
      <Field label="Title">
        <Input required maxLength={200} value={form.title} onChange={e => update({ title: e.target.value })} />
      </Field>
      <Field label="Message">
        <Textarea required rows={5} maxLength={10000} value={form.text} onChange={e => update({ text: e.target.value })} />
      </Field>
      {send.error && <Alert>{send.error}</Alert>}
      {sentTo !== null && <Alert tone="success">Announcement sent to {plural(sentTo, 'recipient')}.</Alert>}
      <div>
        <Button type="submit" variant="primary" busy={send.busy} busyText="Sending…">
          Send announcement
        </Button>
      </div>
    </form>
  )
}
