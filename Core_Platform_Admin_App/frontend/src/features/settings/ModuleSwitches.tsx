import SectionHeader from '../../components/ui/SectionHeader'
import Checkbox from '../../components/form/Checkbox'
import type { ConnectedModule } from '../../types/api'

interface ModuleSwitchesProps {
  modules: ConnectedModule[]
  onToggle: (code: string, enabled: boolean) => void
}

/** FR30: a disabled module disappears from home pages and the gateway answers 503 for it. */
export default function ModuleSwitches({ modules, onToggle }: ModuleSwitchesProps) {
  return (
    <section>
      <SectionHeader title="Connected modules" description="A disabled module disappears from every user's home page." />
      <div className="flex flex-col gap-4">
        {modules.map(module => (
          <Checkbox key={module.code} label={module.name} checked={module.enabled} onChange={e => onToggle(module.code, e.target.checked)} />
        ))}
      </div>
    </section>
  )
}
