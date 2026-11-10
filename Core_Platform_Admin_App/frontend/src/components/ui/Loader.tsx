export default function Loader({ label = 'Loading…' }: { label?: string }) {
  return (
    <p role="status" className="py-8 text-sm text-muted">
      {label}
    </p>
  )
}
