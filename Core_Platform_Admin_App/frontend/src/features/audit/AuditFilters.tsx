import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import type { AuditFilters as Filters } from '../../types/api'

interface AuditFiltersProps {
  value: Required<Filters>
  onChange: (value: Required<Filters>) => void
}

/** FR34: filter activity records by date, actor, action and result. */
export default function AuditFilters({ value, onChange }: AuditFiltersProps) {
  const set = (changes: Partial<Filters>) => onChange({ ...value, ...changes })
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      <Field label="From">
        <Input type="date" value={value.from} onChange={e => set({ from: e.target.value })} />
      </Field>
      <Field label="To">
        <Input type="date" value={value.to} onChange={e => set({ to: e.target.value })} />
      </Field>
      <Field label="Actor">
        <Input maxLength={150} value={value.actor} onChange={e => set({ actor: e.target.value })} />
      </Field>
      <Field label="Action">
        <Input maxLength={150} value={value.action} onChange={e => set({ action: e.target.value })} />
      </Field>
      <Field label="Result">
        <Select placeholder="Any" options={['Success', 'Failed']} value={value.result} onChange={e => set({ result: e.target.value })} />
      </Field>
    </div>
  )
}
