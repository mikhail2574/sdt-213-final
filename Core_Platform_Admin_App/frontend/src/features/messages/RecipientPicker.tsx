import { useState } from 'react'
import { messagesApi } from '../../api/messagesApi'
import { usersApi } from '../../api/usersApi'
import useAuth, { useCurrentUser } from '../../auth/useAuth'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { PERMISSIONS } from '../../lib/permissions'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import type { ContactGroup } from '../../types/api'
import type { Contact } from './useContacts'

export type Recipient = { kind: 'person'; contact: Contact } | { kind: 'group'; group: ContactGroup }

interface RecipientPickerProps {
  value: Recipient | null
  onChange: (recipient: Recipient | null) => void
}

const MAX_RESULTS = 6

const OPTION_CLASSES = 'w-full py-2 text-left text-sm hover:text-lilac-deep'

/**
 * Offices and course groups from GET /groups, and people from the directory. The server returns
 * only people the user may see, and checks again who may be contacted when the message is sent.
 */
export default function RecipientPicker({ value, onChange }: RecipientPickerProps) {
  const me = useCurrentUser()
  const { can } = useAuth()
  const canSearch = can([PERMISSIONS.DIRECTORY_VIEW, PERMISSIONS.USERS_VIEW])
  const [query, setQuery] = useState('')
  const search = useDebouncedValue(query.trim())
  const groups = useAsync(messagesApi.groups, [])
  const people = useAsync(
    () => (canSearch ? usersApi.list({ q: search, size: MAX_RESULTS + 1 }).then(page => page.items) : Promise.resolve([])),
    [search, canSearch],
  )

  if (value) {
    const label = value.kind === 'person' ? value.contact.name : value.group.title
    const detail = value.kind === 'person' ? value.contact.role : value.group.group_type === 'OFFICE' ? 'Office' : 'Course'
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span>
          To <strong>{label}</strong>
          <span className="text-muted"> · {detail}</span>
        </span>
        <Button variant="quiet" onClick={() => onChange(null)}>
          Change
        </Button>
      </div>
    )
  }

  const matchingGroups = (groups.data ?? []).filter(group => group.title.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="flex flex-col gap-2">
      <Field label="To">
        <Input type="search" placeholder={canSearch ? 'Search by name or department' : 'Search offices'} value={query} onChange={e => setQuery(e.target.value)} />
      </Field>
      {matchingGroups.length > 0 && (
        <ul className="divide-y divide-line">
          {matchingGroups.slice(0, MAX_RESULTS).map(group => (
            <li key={group.code}>
              <button type="button" onClick={() => onChange({ kind: 'group', group })} className={OPTION_CLASSES}>
                {group.title}
                <span className="text-muted"> · {group.group_type === 'OFFICE' ? 'Office' : 'Course'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      {canSearch && (
        <AsyncView state={people}>
          {users => {
            const options = users.filter(person => person.id !== me.id).slice(0, MAX_RESULTS)
            if (options.length === 0) return matchingGroups.length ? null : <EmptyState message="Nobody matches your search." />
            return (
              <ul className="divide-y divide-line">
                {options.map(person => (
                  <li key={person.id}>
                    <button
                      type="button"
                      onClick={() => onChange({ kind: 'person', contact: { id: person.id, name: person.name, role: person.role } })}
                      className={OPTION_CLASSES}
                    >
                      {person.name}
                      <span className="text-muted">
                        {' · '}
                        {person.role}
                        {person.department ? `, ${person.department}` : ''}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )
          }}
        </AsyncView>
      )}
      {!canSearch && groups.data && matchingGroups.length === 0 && <EmptyState message="No offices match your search." />}
    </div>
  )
}
