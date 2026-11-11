import { ROLES, STATUSES } from '../../lib/constants'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import Select from '../../components/form/Select'
import type { UserFilters as Filters } from '../../types/api'

type FilterValues = Required<Pick<Filters, 'q' | 'role' | 'department' | 'status'>>

interface UserFiltersProps {
  value: FilterValues
  departments: string[]
  onChange: (value: FilterValues) => void
}

/** FR10: search by name or email, filter by role, department and status. */
export default function UserFilters({ value, departments, onChange }: UserFiltersProps) {
  const set = (changes: Partial<Filters>) => onChange({ ...value, ...changes })
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr]">
      <Field label="Search by name or email" hideLabel>
        <Input type="search" placeholder="Search by name or email" maxLength={150} value={value.q} onChange={e => set({ q: e.target.value })} />
      </Field>
      <Field label="Role" hideLabel>
        <Select placeholder="All roles" options={ROLES} value={value.role} onChange={e => set({ role: e.target.value })} />
      </Field>
      <Field label="Department" hideLabel>
        <Select placeholder="All departments" options={departments} value={value.department} onChange={e => set({ department: e.target.value })} />
      </Field>
      <Field label="Status" hideLabel>
        <Select placeholder="All statuses" options={STATUSES} value={value.status} onChange={e => set({ status: e.target.value })} />
      </Field>
    </div>
  )
}
