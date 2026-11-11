import { adminApi } from '../../api/adminApi'
import useAsync from '../../hooks/useAsync'
import AsyncView from '../../components/ui/AsyncView'
import SettingsForm from './SettingsForm'

/** FR29, FR30: platform-wide settings and module switches. */
export default function SettingsPage() {
  const settings = useAsync(adminApi.settings, [])
  return (
    <AsyncView state={settings} loadingLabel="Loading settings…">
      {data => <SettingsForm initial={data} onSaved={settings.reload} />}
    </AsyncView>
  )
}
