import { useState } from 'react'
import { reportsApi } from '../../api/reportsApi'
import useAction from '../../hooks/useAction'
import useAsync from '../../hooks/useAsync'
import { saveFile } from '../../lib/download'
import Alert from '../../components/ui/Alert'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import SectionHeader from '../../components/ui/SectionHeader'
import Field from '../../components/form/Field'
import Select from '../../components/form/Select'
import ReportSummary from './ReportSummary'
import ReportTable from './ReportTable'

/**
 * UC16 View and export reports (FR27, FR28). GET /reports returns the cross-module report
 * for administrators and viewers, and only their own courses for faculty.
 */
export default function ReportsPage() {
  const [period, setPeriod] = useState('')
  const report = useAsync(() => reportsApi.get(period || undefined), [period])
  const exportCsv = useAction(async () => saveFile(await reportsApi.csv(period || report.data?.period), 'report.csv'))

  return (
    <AsyncView state={report} loadingLabel="Building the report…">
      {data => (
        <>
          <div className="mb-10 flex flex-wrap items-end gap-4">
            <div className="w-48">
              <Field label="Period">
                <Select options={data.periods ?? [data.period]} value={period || data.period} onChange={e => setPeriod(e.target.value)} />
              </Field>
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
          {data.missing_modules && data.missing_modules.length > 0 && (
            <div className="mb-8">
              <Alert tone="info">Not available right now: {data.missing_modules.join(', ')}. The report is shown without their data.</Alert>
            </div>
          )}
          <ReportSummary metrics={data.summary ?? []} />
          <SectionHeader title={data.title} />
          <ReportTable report={data} />
        </>
      )}
    </AsyncView>
  )
}
