import type { ReactNode } from 'react'

export type Tone = 'neutral' | 'blue' | 'lilac' | 'rose'

const TONES: Record<Tone, string> = {
  neutral: 'bg-field',
  blue: 'bg-sky',
  lilac: 'bg-lilac',
  rose: 'bg-rose',
}

/** Small status label: pastel fill, black text, nothing else. */
export default function Badge({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium whitespace-nowrap text-ink ${TONES[tone]}`}>{children}</span>
}
