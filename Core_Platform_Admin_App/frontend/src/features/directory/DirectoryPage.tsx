import { useState } from 'react'
import { usersApi } from '../../api/usersApi'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import AsyncView from '../../components/ui/AsyncView'
import Pager from '../../components/ui/Pager'
import Field from '../../components/form/Field'
import Input from '../../components/form/Input'
import DirectoryTable from './DirectoryTable'

/**
 * UC10 Search user directory (FR18). Uses the same GET /users endpoint as the console;
 * the server returns only basic contact data and, for students, only faculty and staff (NFR11).
 */
const PAGE_SIZE = 25

export default function DirectoryPage() {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(0)
  const search = useDebouncedValue(query.trim())
  const people = useAsync(() => usersApi.list({ q: search, page, size: PAGE_SIZE }), [search, page])

  return (
    <>
      <div className="mb-6 max-w-md">
        <Field label="Search by name or department" hideLabel>
          <Input type="search" placeholder="Search by name or department" maxLength={150} value={query} onChange={e => {
              setQuery(e.target.value)
              setPage(0)
            }}
          />
        </Field>
      </div>
      <AsyncView state={people}>
        {result => (
          <>
            <DirectoryTable users={result.items} />
            <Pager page={result.page} size={result.size} total={result.total} onChange={setPage} />
          </>
        )}
      </AsyncView>
    </>
  )
}
