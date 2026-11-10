interface StatCardProps {
  label: string
  value: string | number
  note?: string
}

/** A key number: large figure, short label underneath. */
export default function StatCard({ label, value, note }: StatCardProps) {
  return (
    <div>
      <p className="text-4xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-sm">{label}</p>
      {note && <p className="text-xs text-muted">{note}</p>}
    </div>
  )
}
