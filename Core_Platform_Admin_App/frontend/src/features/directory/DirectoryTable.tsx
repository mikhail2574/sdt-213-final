import { useNavigate } from 'react-router-dom'
import { useCurrentUser } from '../../auth/useAuth'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { Table, Td } from '../../components/ui/Table'
import type { User } from '../../types/api'
import type { MessagesLocationState } from '../messages/messagesLocationState'

export default function DirectoryTable({ users }: { users: User[] }) {
  const me = useCurrentUser()
  const navigate = useNavigate()

  if (users.length === 0) return <EmptyState message="No people match your search." />

  const messagePerson = (person: User) => {
    const state: MessagesLocationState = { recipient: { id: person.id, name: person.name, role: person.role } }
    navigate('/messages', { state })
  }

  return (
    <Table headers={['Name', 'Role', 'Department', 'Email', '']}>
      {users.map(person => (
        <tr key={person.id}>
          <Td className="font-medium">{person.name}</Td>
          <Td>{person.role}</Td>
          <Td className="text-muted">{person.department || '—'}</Td>
          <Td>
            <a href={`mailto:${person.email}`} className="underline-offset-4 hover:underline">
              {person.email}
            </a>
          </Td>
          <Td className="text-right">
            {person.id !== me.id && (
              <Button variant="quiet" onClick={() => messagePerson(person)}>
                Message
              </Button>
            )}
          </Td>
        </tr>
      ))}
    </Table>
  )
}
