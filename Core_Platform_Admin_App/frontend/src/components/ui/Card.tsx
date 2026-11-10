import type { ReactNode } from 'react'

/** A quiet surface for grouping content: a slightly lighter fill, no border, no shadow. */
export default function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-surface p-6 ${className}`}>{children}</section>
}
