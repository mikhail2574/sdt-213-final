import { useState, type FormEvent } from 'react'
import { adminApi } from '../../api/adminApi'
import useAction from '../../hooks/useAction'
import Alert from '../../components/ui/Alert'
import Button from '../../components/ui/Button'
import type { AdminSettings, SystemSettings } from '../../types/api'
import GeneralSettingsFields from './GeneralSettingsFields'
import ModuleSwitches from './ModuleSwitches'
import SecuritySettingsFields from './SecuritySettingsFields'
import { validateSettings } from './validateSettings'

interface SettingsFormProps {
  initial: AdminSettings
  onSaved: () => void
}

/** UC17 Configure system settings: everything is saved as one object (PUT /admin/settings). */
export default function SettingsForm({ initial, onSaved }: SettingsFormProps) {
  const [settings, setSettings] = useState(initial.settings)
  const [modules, setModules] = useState(initial.modules)
  const [saved, setSaved] = useState(false)
  const save = useAction(adminApi.saveSettings)

  const updateSettings = (changes: Partial<SystemSettings>) => {
    setSettings(previous => ({ ...previous, ...changes }))
    setSaved(false)
  }
  const toggleModule = (code: string, enabled: boolean) => {
    setModules(previous => previous.map(module => (module.code === code ? { ...module, enabled } : module)))
    setSaved(false)
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    const error = validateSettings(settings)
    if (error) {
      save.setError(error)
      return
    }
    const result = await save.run({ ...initial, settings, modules })
    if (result === undefined) return
    setSaved(true)
    onSaved()
  }

  return (
    <form onSubmit={submit} className="grid items-start gap-14 lg:grid-cols-[1.6fr_1fr]">
      <div className="flex flex-col gap-12">
        <GeneralSettingsFields value={settings} onChange={updateSettings} />
        <SecuritySettingsFields value={settings} onChange={updateSettings} />
        {save.error && <Alert>{save.error}</Alert>}
        {saved && <Alert tone="success">Settings saved. The change is recorded in the activity log.</Alert>}
        <div>
          <Button type="submit" variant="primary" busy={save.busy} busyText="Saving…">
            Save settings
          </Button>
        </div>
      </div>
      <ModuleSwitches modules={modules} onToggle={toggleModule} />
    </form>
  )
}
