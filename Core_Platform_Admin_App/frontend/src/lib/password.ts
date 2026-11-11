export const PASSWORD_HINT = 'At least 8 characters, including a letter and a number.'

/**
 * Mirrors the backend password rules so users get feedback before submitting.
 * Returns an error message, or an empty string when the password is acceptable.
 */
export function validateNewPassword(password: string, confirmation: string, minLength = 8): string {
  if (password !== confirmation) return 'The new passwords do not match.'
  if (password.length < minLength || !/\p{L}/u.test(password) || !/\p{Nd}/u.test(password)) {
    return `Use at least ${minLength} characters, including a letter and a number.`
  }
  if (new TextEncoder().encode(password).length > 72) return 'The password must be at most 72 bytes long.'
  return ''
}
