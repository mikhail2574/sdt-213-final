import type { Me, User } from '../types/api'

export function initials(name = ''): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(part => part[0])
    .join('')
    .toUpperCase()
}

function toDate(value: string): Date | null {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—'
  return toDate(value)?.toLocaleString() ?? value
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelative(value?: string | null): string {
  if (!value) return '—'
  const date = toDate(value)
  if (!date) return value
  const seconds = Math.round((date.getTime() - Date.now()) / 1000)
  const match = UNITS.find(([, size]) => Math.abs(seconds) >= size)
  if (!match) return 'Just now'
  const [unit, size] = match
  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(Math.round(seconds / size), unit)
}

export function greeting(date = new Date()): string {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

export function firstName(user: Me): string {
  return user.preferred_name || user.name.split(' ')[0] || ''
}

export function roleLabel(user: Pick<User, 'role' | 'console_access'>): string {
  return user.console_access ? `${user.role} · ${user.console_access}` : user.role
}

/** "1 user", "3 users" */
export function plural(count: number, noun: string): string {
  return `${count} ${noun}${count === 1 ? '' : 's'}`
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong.'
}
