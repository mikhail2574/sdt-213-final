import type { ReactNode } from 'react'

/** Bottom row of a dialog form: optional action on the left, Cancel/Save on the right. */
export default function DialogActions({ start, children }: { start?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
      <div>{start}</div>
      <div className="flex items-center gap-4">{children}</div>
    </div>
  )
}
