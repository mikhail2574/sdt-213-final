import { useEffect, useMemo, useState } from 'react'
import { adminApi } from '../../api/adminApi'
import useAction from '../../hooks/useAction'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { uniqueSorted } from '../../lib/collections'
import { saveFile } from '../../lib/download'
import Alert from '../../components/ui/Alert'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import type { AuditEntry } from '../../types/api'
import AuditFilters from './AuditFilters'
import AuditTable from './AuditTable'
import { NO_FILTERS, toAuditQuery } from './auditQuery'

/** The API returns at most this many records per request. */
const PAGE_SIZE = 100

/** UC19 Review activity log (FR34, FR35). Export uses the same filters with format=csv. */
export default function AuditLogPage() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const applied = useDebouncedValue(filters)
  const query = useMemo(() => toAuditQuery(applied), [applied])
  const entries = useAsync(() => adminApi.audit(query), [query])
  const [hasMore, setHasMore] = useState(false)
  const [actors, setActors] = useState<string[]>([])
  const [actions, setActions] = useState<string[]>([])

  // Filter options grow with every page the server returns.
  useEffect(() => {
    if (!entries.data) return
    setHasMore(entries.data.length > 0 && entries.data.length % PAGE_SIZE === 0)
    setActors(previous => uniqueSorted([...previous, ...entries.data!.map(entry => entry.actor)]))
    setActions(previous => uniqueSorted([...previous, ...entries.data!.map(entry => entry.action)]))
  }, [entries.data])

  const older = useAction(async (loaded: AuditEntry[]) => {
    const page = await adminApi.audit(query, loaded[loaded.length - 1].id)
    entries.setData([...loaded, ...page])
  })
  const exportCsv = useAction(async () => saveFile(await adminApi.auditCsv(query), 'activity-log.csv'))

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end">
        <div className="flex-1">
          <AuditFilters value={filters} actors={actors} actions={actions} onChange={setFilters} />
        </div>
        <Button onClick={() => void exportCsv.run()} busy={exportCsv.busy} busyText="Exporting…">
          Export CSV
        </Button>
      </div>
      {(exportCsv.error || older.error) && (
        <div className="mb-6">
          <Alert>{exportCsv.error || older.error}</Alert>
        </div>
      )}
      <AsyncView state={entries} loadingLabel="Loading records…">
        {list => (
          <>
            <AuditTable entries={list} />
            {hasMore && (
              <div className="mt-6">
                <Button variant="quiet" onClick={() => void older.run(list)} busy={older.busy} busyText="Loading…">
                  Show older records
                </Button>
              </div>
            )}
          </>
        )}
      </AsyncView>
    </>
  )
}
