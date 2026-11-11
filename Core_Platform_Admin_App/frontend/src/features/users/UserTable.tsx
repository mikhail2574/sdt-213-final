import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Table, Td } from '../../components/ui/Table'
import { STATUS_TONES } from '../../lib/constants'
import { formatRelative, roleLabel } from '../../lib/format'
import type { User } from '../../types/api'

interface UserTableProps {
  users: User[]
  canEdit: boolean
  busyId: number | null
  onOpen: (user: User) => void
  onToggleStatus: (user: User) => void
}

export default function UserTable({ users, canEdit, busyId, onOpen, onToggleStatus }: UserTableProps) {
  if (users.length === 0) return <EmptyState message="No users match your search." />

  const headers = ['User', 'Role', 'Department', 'Status', 'Last sign-in', ...(canEdit ? [''] : [])]
  return (
    <Table headers={headers}>
      {users.map(person => (
        <tr key={person.id}>
          <Td>
            <button type="button" onClick={() => onOpen(person)} className="text-left hover:text-lilac-deep">
              <span className="block font-medium">{person.name}</span>
              <span className="block text-xs text-muted">{person.email}</span>
            </button>
          </Td>
          <Td>{roleLabel(person)}</Td>
          <Td className="text-muted">{person.department || '—'}</Td>
          <Td>{person.status && <Badge tone={STATUS_TONES[person.status]}>{person.status}</Badge>}</Td>
          <Td className="text-muted">{formatRelative(person.last_login)}</Td>
          {canEdit && (
            <Td className="text-right">
              <Button variant="quiet" onClick={() => onToggleStatus(person)} disabled={busyId === person.id}>
                {person.status === 'Inactive' ? 'Activate' : 'Deactivate'}
              </Button>
            </Td>
          )}
        </tr>
      ))}
    </Table>
  )
}
