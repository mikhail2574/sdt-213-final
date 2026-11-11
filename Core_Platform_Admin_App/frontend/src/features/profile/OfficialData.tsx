import { useCurrentUser } from '../../auth/useAuth'
import SectionHeader from '../../components/ui/SectionHeader'
import { roleLabel } from '../../lib/format'

/** Data managed by the university: read-only for the user (UC9 alternative flow 3a). */
export default function OfficialData() {
  const user = useCurrentUser()
  const rows: [string, string | null | undefined][] = [
    ['Full name', user.name],
    ['University email', user.email],
    ['Role', roleLabel(user)],
    ['Department', user.department],
  ]

  return (
    <section>
      <SectionHeader title="Official data" description="Only an administrator or the registrar office can change it." />
      <dl className="divide-y divide-line text-sm">
        {rows
          .filter(([, value]) => Boolean(value))
          .map(([label, value]) => (
            <div key={label} className="flex justify-between gap-6 py-3">
              <dt className="text-muted">{label}</dt>
              <dd className="text-right font-medium">{value}</dd>
            </div>
          ))}
      </dl>
    </section>
  )
}
