import { useState } from 'react'
import { adminApi } from '../../api/adminApi'
import useAction from '../../hooks/useAction'
import useAsync from '../../hooks/useAsync'
import useDebouncedValue from '../../hooks/useDebouncedValue'
import { saveFile } from '../../lib/download'
import Alert from '../../components/ui/Alert'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import type { AuditFilters as Filters } from '../../types/api'
import AuditFilters from './AuditFilters'
import AuditTable from './AuditTable'

const NO_FILTERS: Required<Filters> = { q: '', from: '', to: '', actor: '', action: '', result: '' }

/** UC19 Review activity log (FR34, FR35). Export uses the same filters with format=csv. */
export default function AuditLogPage() {
  const [filters, setFilters] = useState(NO_FILTERS)
  const applied = useDebouncedValue(filters)
  const entries = useAsync(() => adminApi.audit(applied), [applied])
  const exportCsv = useAction(async () => saveFile(await adminApi.auditCsv(applied), 'activity-log.csv'))

  return (
    <>
      <div className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end">
        <div className="flex-1">
          <AuditFilters value={filters} onChange={setFilters} />
        </div>
        <Button onClick={() => void exportCsv.run()} busy={exportCsv.busy} busyText="Exporting…">
          Export CSV
        </Button>
      </div>
      {exportCsv.error && (
        <div className="mb-6">
          <Alert>{exportCsv.error}</Alert>
        </div>
      )}
      <AsyncView state={entries} loadingLabel="Loading records…">
        {list => <AuditTable entries={list} />}
      </AsyncView>
    </>
  )
}
