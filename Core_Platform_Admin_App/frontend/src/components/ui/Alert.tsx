import type { ReactNode } from 'react'

type AlertTone = 'error' | 'success' | 'info'

const TONES: Record<AlertTone, string> = {
  error: 'bg-rose',
  success: 'bg-sky',
  info: 'bg-lilac',
}

interface AlertProps {
  tone?: AlertTone
  children: ReactNode
  onDismiss?: () => void
}

export default function Alert({ tone = 'error', children, onDismiss }: AlertProps) {
  return (
    <div role={tone === 'error' ? 'alert' : 'status'} className={`flex items-start justify-between gap-4 rounded-xl px-4 py-3 text-sm ${TONES[tone]}`}>
      <div>{children}</div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="leading-none">
          ×
        </button>
      )}
    </div>
  )
}
