import SectionHeader from '../../components/ui/SectionHeader'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import type { SystemSettings } from '../../types/api'

interface SecuritySettingsFieldsProps {
  value: SystemSettings
  onChange: (changes: Partial<SystemSettings>) => void
}

export default function SecuritySettingsFields({ value, onChange }: SecuritySettingsFieldsProps) {
  const number = (raw: string) => (raw === '' ? 0 : Number(raw))
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader title="Passwords and sessions" />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Minimum password length">
          <Input
            type="number"
            min={8}
            max={72}
            value={value.min_password_length}
            onChange={e => onChange({ min_password_length: number(e.target.value) })}
          />
        </Field>
        <Field label="Session timeout, minutes">
          <Input
            type="number"
            min={5}
            max={480}
            value={value.session_timeout_minutes}
            onChange={e => onChange({ session_timeout_minutes: number(e.target.value) })}
          />
        </Field>
        <Field label="Lock after failed attempts">
          <Input
            type="number"
            min={1}
            max={20}
            value={value.lockout_attempts}
            onChange={e => onChange({ lockout_attempts: number(e.target.value) })}
          />
        </Field>
      </div>
    </section>
  )
}
