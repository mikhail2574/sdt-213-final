import { CONSOLE_ACCESS, ROLES } from '../../lib/constants'
import Field from '../../components/form/Field'
import Select from '../../components/form/Select'
import type { ConsoleAccess, Role } from '../../types/api'

interface RoleFieldsProps {
  role: Role
  consoleAccess: ConsoleAccess | ''
  disabled?: boolean
  onChange: (role: Role, consoleAccess: ConsoleAccess | '') => void
}

/** University role plus Admin Console access level (only staff can be Operator or Viewer). */
export default function RoleFields({ role, consoleAccess, disabled = false, onChange }: RoleFieldsProps) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <Field label="Role">
        <Select options={ROLES} value={role} disabled={disabled} onChange={e => onChange(e.target.value as Role, '')} />
      </Field>
      <Field label="Console access">
        <Select
          placeholder="None"
          options={CONSOLE_ACCESS}
          value={consoleAccess}
          disabled={disabled || role !== 'Staff'}
          onChange={e => onChange(role, e.target.value as ConsoleAccess | '')}
        />
      </Field>
    </div>
  )
}
