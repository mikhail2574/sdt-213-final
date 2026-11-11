import { cloneElement, isValidElement, useId, type ReactNode } from 'react'

interface FieldProps {
  label: string
  hint?: string
  children: ReactNode
  /** Visually hides the label but keeps it for screen readers (e.g. search boxes). */
  hideLabel?: boolean
}

/** A <label> wrapper so every control has an accessible name (NFR15). */
export default function Field({ label, hint, children, hideLabel = false }: FieldProps) {
  const generatedId = useId()
  const control = isValidElement<{ id?: string; 'aria-describedby'?: string }>(children) ? children : null
  const id = control?.props.id ?? generatedId
  const description = [control?.props['aria-describedby'], hint ? `${id}-hint` : ''].filter(Boolean).join(' ') || undefined
  return (
    <div className="flex flex-col gap-2 text-sm">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'font-medium'}>{label}</label>
      {control ? cloneElement(control, { id, 'aria-describedby': description }) : children}
      {hint && <span id={`${id}-hint`} className="text-xs text-muted">{hint}</span>}
    </div>
  )
}
