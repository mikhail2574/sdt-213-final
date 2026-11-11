import { useState } from 'react'
import { meApi } from '../../api/meApi'
import useAuth, { useCurrentUser } from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import { NOTIFICATION_CATEGORIES } from '../../lib/constants'
import Alert from '../../components/ui/Alert'
import SectionHeader from '../../components/ui/SectionHeader'
import Checkbox from '../../components/form/Checkbox'

/** Email copies are on for a category until the user turns them off. */
const DEFAULT_ENABLED = true

/** FR24: choose which notification categories are also sent by email. Saved through PATCH /me. */
export default function EmailPreferences() {
  const user = useCurrentUser()
  const { setUser } = useAuth()
  const [preferences, setPreferences] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(user.email_preferences.map(preference => [preference.category, preference.email_enabled])),
  )

  const save = useAction(async (changes: Record<string, boolean>) => {
    setUser(await meApi.update({ email_preferences: changes }))
    return true
  })

  async function toggle(code: string, enabled: boolean) {
    const previous = preferences
    setPreferences({ ...preferences, [code]: enabled })
    const saved = await save.run({ [code]: enabled })
    if (!saved) setPreferences(previous)
  }

  return (
    <section>
      <SectionHeader title="Email copies" description={`In-app notifications are always on. Copies go to ${user.email}.`} />
      <div className="flex flex-col gap-4">
        {NOTIFICATION_CATEGORIES.map(category => (
          <Checkbox
            key={category.code}
            label={category.label}
            checked={preferences[category.code] ?? DEFAULT_ENABLED}
            disabled={save.busy}
            onChange={event => void toggle(category.code, event.target.checked)}
          />
        ))}
      </div>
      {save.error && (
        <div className="mt-4">
          <Alert>{save.error}</Alert>
        </div>
      )}
    </section>
  )
}
