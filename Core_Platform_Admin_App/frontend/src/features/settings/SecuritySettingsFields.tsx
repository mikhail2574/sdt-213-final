import SectionHeader from '../../components/ui/SectionHeader'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import type { SystemSettings } from '../../types/api'
import { LIMITS } from './validateSettings'

interface SecuritySettingsFieldsProps {
  value: SystemSettings
  onChange: (changes: Partial<SystemSettings>) => void
}

const toNumber = (raw: string) => (raw === '' ? 0 : Number(raw))

export default function SecuritySettingsFields({ value, onChange }: SecuritySettingsFieldsProps) {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader title="Passwords and sessions" />
      <div className="grid gap-5 sm:grid-cols-3">
        <Field label="Minimum password length">
          <Input
            type="number"
            {...LIMITS.min_password_length}
            value={value.min_password_length}
            onChange={e => onChange({ min_password_length: toNumber(e.target.value) })}
          />
        </Field>
        <Field label="Session timeout, minutes">
          <Input
            type="number"
            {...LIMITS.session_timeout}
            value={value.session_timeout}
            onChange={e => onChange({ session_timeout: toNumber(e.target.value) })}
          />
        </Field>
        <Field label="Lock after failed attempts">
          <Input
            type="number"
            {...LIMITS.lockout_attempts}
            value={value.lockout_attempts}
            onChange={e => onChange({ lockout_attempts: toNumber(e.target.value) })}
          />
        </Field>
      </div>
    </section>
  )
}
