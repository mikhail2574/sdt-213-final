import { useState } from 'react'
import { reportsApi } from '../../api/reportsApi'
import useAction from '../../hooks/useAction'
import useAsync from '../../hooks/useAsync'
import { saveFile } from '../../lib/download'
import Alert from '../../components/ui/Alert'
import AsyncView from '../../components/ui/AsyncView'
import Button from '../../components/ui/Button'
import { moduleName } from '../../lib/modules'
import SectionHeader from '../../components/ui/SectionHeader'
import { currentTerm } from './currentTerm'
import PeriodForm from './PeriodForm'
import ReportTable from './ReportTable'

/**
 * UC16 View and export reports (FR27, FR28). The server collects the metrics from every module:
 * the whole platform for administrators and viewers, only their own courses for faculty.
 */
export default function ReportsPage() {
  const [period, setPeriod] = useState(currentTerm)
  const report = useAsync(() => reportsApi.get(period), [period])
  const exportCsv = useAction(async () => saveFile(await reportsApi.csv(period), 'report.csv'))

  return (
    <>
      <div className="mb-10">
        <PeriodForm period={period} onSubmit={setPeriod} />
      </div>
      <AsyncView state={report} loadingLabel="Collecting data from the modules…">
        {data => (
          <section>
            <SectionHeader
              title={`Period: ${data.period}`}
              description={data.scope === 'own_courses' ? 'Your courses only.' : 'All connected modules.'}
              actions={
                <Button onClick={() => void exportCsv.run()} busy={exportCsv.busy} busyText="Exporting…">
                  Export CSV
                </Button>
              }
            />
            {exportCsv.error && (
              <div className="mb-6">
                <Alert>{exportCsv.error}</Alert>
              </div>
            )}
            {data.missing_modules.length > 0 && (
              <div className="mb-6">
                <Alert tone="info">
                  <p>The report is shown without these modules:</p>
                  <ul className="mt-1">
                    {data.missing_modules.map(missing => (
                      <li key={missing.module}>
                        {moduleName(missing.module)}: {missing.reason}
                      </li>
                    ))}
                  </ul>
                </Alert>
              </div>
            )}
            <ReportTable rows={data.rows} />
          </section>
        )}
      </AsyncView>
    </>
  )
}
