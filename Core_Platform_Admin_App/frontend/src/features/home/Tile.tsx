import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'

interface TileProps {
  title: string
  description?: string
  footer?: string | null
  /** Internal route; tiles without a route use `onClick`. */
  to?: string
  onClick?: () => void
  disabled?: boolean
}

const CLASSES = 'block w-full rounded-2xl bg-surface p-5 text-left transition-colors'

/** One home page tile: title, short description and an optional status line. */
export default function Tile({ title, description, footer, to, onClick, disabled = false }: TileProps) {
  const body: ReactNode = (
    <>
      <h3 className="font-semibold">{title}</h3>
      {description && <p className="mt-1 text-sm text-muted">{description}</p>}
      {footer && <p className="mt-4 text-sm">{footer}</p>}
    </>
  )

  if (to) {
    return (
      <Link to={to} className={`${CLASSES} hover:bg-lilac`}>
        {body}
      </Link>
    )
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} disabled={disabled} className={`${CLASSES} hover:bg-lilac disabled:cursor-wait`}>
        {body}
      </button>
    )
  }
  return <div className={CLASSES}>{body}</div>
}
