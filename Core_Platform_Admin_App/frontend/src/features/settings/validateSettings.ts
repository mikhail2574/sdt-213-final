import type { SystemSettings } from '../../types/api'

/** Limits enforced by the server (SettingsService). */
export const LIMITS = {
  min_password_length: { min: 8, max: 72 },
  session_timeout: { min: 1, max: 120 },
  lockout_attempts: { min: 3, max: 10 },
} as const

const LABELS: Record<keyof typeof LIMITS, string> = {
  min_password_length: 'The minimum password length',
  session_timeout: 'The session timeout',
  lockout_attempts: 'The number of attempts before locking',
}

/** Client-side checks before PUT /admin/settings (UC17 alternative flow 5a). Returns an error message or ''. */
export function validateSettings(settings: SystemSettings): string {
  if (!settings.university_name.trim()) return 'Enter the university name.'
  if (Boolean(settings.term_start) !== Boolean(settings.term_end)) return 'Enter both term dates, or leave both empty.'
  if (settings.term_start && settings.term_end && settings.term_start > settings.term_end) return 'The term must end after it starts.'
  for (const key of Object.keys(LIMITS) as (keyof typeof LIMITS)[]) {
    const { min, max } = LIMITS[key]
    if (!Number.isInteger(settings[key]) || settings[key] < min || settings[key] > max) {
      return `${LABELS[key]} must be between ${min} and ${max}.`
    }
  }
  return ''
}
