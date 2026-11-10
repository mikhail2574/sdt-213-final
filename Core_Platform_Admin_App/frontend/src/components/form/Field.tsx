import type { ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  /** Visually hides the label but keeps it for screen readers (e.g. search boxes). */
  hideLabel?: boolean
}

/** A <label> wrapper so every control has an accessible name (NFR15). */
export default function Field({ label, hint, children, hideLabel = false }: FieldProps) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className={hideLabel ? 'sr-only' : 'font-medium'}>{label}</span>
      {children}
      {hint && <span className="text-xs text-muted">{hint}</span>}
    </label>
  )
}
