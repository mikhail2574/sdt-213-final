import type { SystemSettings } from '../../types/api'

/** Client-side checks before PUT /admin/settings (UC17 alternative flow 5a). Returns an error message or ''. */
export function validateSettings(settings: SystemSettings): string {
  if (!settings.university_name.trim()) return 'Enter the university name.'
  if (settings.term_start && settings.term_end && settings.term_start > settings.term_end) {
    return 'The term must end after it starts.'
  }
  if (settings.min_password_length < 8) return 'The minimum password length cannot be lower than 8.'
  if (settings.session_timeout_minutes < 5) return 'The session timeout must be at least 5 minutes.'
  if (settings.lockout_attempts < 1) return 'Allow at least one sign-in attempt before locking.'
  return ''
}
