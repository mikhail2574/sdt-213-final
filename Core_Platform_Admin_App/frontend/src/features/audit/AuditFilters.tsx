import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import type { AuditFilterValues } from './auditQuery'

interface AuditFiltersProps {
  value: AuditFilterValues
  /** Actors and actions seen so far; the API matches them exactly. */
  actors: string[]
  actions: string[]
  onChange: (value: AuditFilterValues) => void
}

/** FR34: filter activity records by text, date, actor, action and result. */
export default function AuditFilters({ value, actors, actions, onChange }: AuditFiltersProps) {
  const set = (changes: Partial<AuditFilterValues>) => onChange({ ...value, ...changes })
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <Field label="Search">
        <Input type="search" maxLength={150} value={value.q} onChange={e => set({ q: e.target.value })} />
      </Field>
      <Field label="From">
        <Input type="date" value={value.from} max={value.to || undefined} onChange={e => set({ from: e.target.value })} />
      </Field>
      <Field label="To">
        <Input type="date" value={value.to} min={value.from || undefined} onChange={e => set({ to: e.target.value })} />
      </Field>
      <Field label="Actor">
        <Select placeholder="Anyone" options={actors} value={value.actor} onChange={e => set({ actor: e.target.value })} />
      </Field>
      <Field label="Action">
        <Select placeholder="Any action" options={actions} value={value.action} onChange={e => set({ action: e.target.value })} />
      </Field>
      <Field label="Result">
        <Select placeholder="Any result" options={['Success', 'Failed']} value={value.result} onChange={e => set({ result: e.target.value })} />
      </Field>
    </div>
  )
}
