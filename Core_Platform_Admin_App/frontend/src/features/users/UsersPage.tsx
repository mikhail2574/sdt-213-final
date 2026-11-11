import { useEffect, useState } from 'react'
import { usersApi } from '../../api/usersApi'
import useAuth from '../../auth/useAuth'
import useAction from '../../hooks/useAction'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { uniqueSorted } from '../../lib/collections'
import { PERMISSIONS } from '../../lib/permissions'
import Alert from '../../components/ui/Alert'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import Pager from '../../components/ui/Pager'
import type { User, UserFilters as Filters } from '../../types/api'
import AddUserDialog from './AddUserDialog'
import UserDetailsDialog from './UserDetailsDialog'
import UserFilters from './UserFilters'
import UserTable from './UserTable'

type FilterValues = Required<Pick<Filters, 'q' | 'role' | 'department' | 'status'>>

const NO_FILTERS: FilterValues = { q: '', role: '', department: '', status: '' }
const PAGE_SIZE = 25

/** UC6 Manage users (FR9-FR13). Operators edit and (de)activate; viewers only read. */
export default function UsersPage() {
  const { can } = useAuth()
  const [filters, setFilters] = useState(NO_FILTERS)
  const [page, setPage] = useState(0)
  const query = useDebouncedValue(filters.q.trim())
  const users = useAsync(
    () => usersApi.list({ ...filters, q: query, page, size: PAGE_SIZE }),
    [query, filters.role, filters.department, filters.status, page],
  )
  const [departments, setDepartments] = useState<string[]>([])
  const [selected, setSelected] = useState<User | null>(null)
  const [adding, setAdding] = useState(false)
  const [notice, setNotice] = useState('')

  // Department filter options grow with every list the server returns.
  useEffect(() => {
    if (users.data) setDepartments(previous => uniqueSorted([...previous, ...users.data!.items.map(user => user.department)]))
  }, [users.data])

  const toggle = useAction(async (user: User) => {
    const status = user.status === 'Inactive' ? 'Active' : 'Inactive'
    await usersApi.update(user.id, { status })
    setNotice(`${user.name} is now ${status.toLowerCase()}.`)
    users.reload()
  })
  const [togglingId, setTogglingId] = useState<number | null>(null)

  const finish = (message: string) => {
    setSelected(null)
    setAdding(false)
    setNotice(message)
    users.reload()
  }

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-start">
        <div className="flex-1">
          <UserFilters
            value={filters}
            departments={departments}
            onChange={next => {
              setFilters(next)
              setPage(0)
            }}
          />
        </div>
        {can(PERMISSIONS.USERS_CREATE) && (
          <Button variant="primary" onClick={() => setAdding(true)}>
            Add user
          </Button>
        )}
      </div>
      {(notice || toggle.error) && (
        <div className="mb-6">
          {toggle.error ? (
            <Alert onDismiss={() => toggle.setError('')}>{toggle.error}</Alert>
          ) : (
            <Alert tone="success" onDismiss={() => setNotice('')}>
              {notice}
            </Alert>
          )}
        </div>
      )}
      <AsyncView state={users} loadingLabel="Loading users…">
        {result => (
          <>
          <UserTable
            users={result.items}
            canEdit={can(PERMISSIONS.USERS_EDIT)}
            busyId={togglingId}
            onOpen={setSelected}
            onToggleStatus={async user => {
              setTogglingId(user.id)
              await toggle.run(user)
              setTogglingId(null)
            }}
          />
          <Pager page={result.page} size={result.size} total={result.total} onChange={setPage} />
          </>
        )}
      </AsyncView>
      {selected && <UserDetailsDialog key={selected.id} user={selected} onClose={() => setSelected(null)} onSaved={finish} />}
      {adding && <AddUserDialog onClose={() => setAdding(false)} onCreated={name => finish(`${name} was created and invited by email.`)} />}
    </>
  )
}
