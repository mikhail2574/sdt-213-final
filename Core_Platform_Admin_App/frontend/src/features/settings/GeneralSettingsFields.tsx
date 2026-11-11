import SectionHeader from '../../components/ui/SectionHeader'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import type { SystemSettings } from '../../types/api'

interface GeneralSettingsFieldsProps {
  value: SystemSettings
  onChange: (changes: Partial<SystemSettings>) => void
}

export default function GeneralSettingsFields({ value, onChange }: GeneralSettingsFieldsProps) {
  return (
    <section className="flex flex-col gap-5">
      <SectionHeader title="University and term" />
      <Field label="University name">
        <Input required maxLength={150} value={value.university_name} onChange={e => onChange({ university_name: e.target.value })} />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Term start">
          <Input type="date" value={value.term_start} onChange={e => onChange({ term_start: e.target.value })} />
        </Field>
        <Field label="Term end">
          <Input type="date" value={value.term_end} onChange={e => onChange({ term_end: e.target.value })} />
        </Field>
      </div>
      <Field label="Email sender address">
        <Input type="email" required value={value.email_sender} onChange={e => onChange({ email_sender: e.target.value })} />
      </Field>
    </section>
  )
}
