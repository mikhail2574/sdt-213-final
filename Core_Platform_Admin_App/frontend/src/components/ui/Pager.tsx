import Button from './Button'

interface PagerProps {
  /** Zero-based page index. */
  page: number
  size: number
  total: number
  onChange: (page: number) => void
}

/** Previous / next controls for offset-paginated lists. Hidden when everything fits on one page. */
export default function Pager({ page, size, total, onChange }: PagerProps) {
  const pages = Math.max(1, Math.ceil(total / size))
  if (pages <= 1) return null

  return (
    <div className="mt-6 flex items-center justify-between gap-4 text-sm">
      <Button variant="quiet" disabled={page === 0} onClick={() => onChange(page - 1)}>
        Previous
      </Button>
      <span className="text-muted">
        Page {page + 1} of {pages}
      </span>
      <Button variant="quiet" disabled={page + 1 >= pages} onClick={() => onChange(page + 1)}>
        Next
      </Button>
    </div>
  )
}
