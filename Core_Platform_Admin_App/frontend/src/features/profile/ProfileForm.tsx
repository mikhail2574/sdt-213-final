import { useState, type FormEvent } from 'react'
import { meApi } from '../../api/meApi'
import useAuth, { useCurrentUser } from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { changedFields } from '../../lib/collections'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import PhotoPicker from './PhotoPicker'

/** UC9 Manage own profile (FR17): preferred name, contact details and photo. */
export default function ProfileForm() {
  const user = useCurrentUser()
  const { setUser } = useAuth()
  const original = {
    preferred_name: user.preferred_name ?? '',
    phone: user.phone ?? '',
    personal_email: user.personal_email ?? '',
  }
  const [form, setForm] = useState(original)
  const [saved, setSaved] = useState(false)

  const save = useAction(async () => {
    const changes = changedFields(original, form)
    if (Object.keys(changes).length === 0) return true
    setUser(await meApi.update(changes))
    return true
  })

  const update = (changes: Partial<typeof form>) => {
    setForm(previous => ({ ...previous, ...changes }))
    setSaved(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (await save.run()) setSaved(true)
  }

  return (
    <section>
      <SectionHeader title="Contact details" />
      <form onSubmit={submit} className="flex flex-col gap-5">
        <PhotoPicker />
        <Field label="Preferred name">
          <Input maxLength={120} value={form.preferred_name} onChange={e => update({ preferred_name: e.target.value })} />
        </Field>
        <Field label="Contact phone">
          <Input type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={e => update({ phone: e.target.value })} />
        </Field>
        <Field label="Personal email">
          <Input
            type="email"
            autoComplete="email"
            maxLength={255}
            value={form.personal_email}
            onChange={e => update({ personal_email: e.target.value })}
          />
        </Field>
        {save.error && <Alert>{save.error}</Alert>}
        {saved && <Alert tone="success">Profile saved.</Alert>}
        <div>
          <Button type="submit" variant="primary" busy={save.busy} busyText="Saving…">
            Save
          </Button>
        </div>
      </form>
    </section>
  )
}
