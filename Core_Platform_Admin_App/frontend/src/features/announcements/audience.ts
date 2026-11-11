import type { User } from '../../types/api'

export type AudienceKind = 'ALL' | 'ROLE' | 'DEPARTMENT' | 'COURSE'

const LABELS: Record<AudienceKind, string> = {
  ALL: 'All users',
  ROLE: 'A role',
  DEPARTMENT: 'My department',
  COURSE: 'A course group',
}

/**
 * Audiences the server accepts from this sender (FR25): administrators may address anyone,
 * staff their own department or a course group they manage, faculty their own course groups.
 */
export function audienceKinds(user: User): { value: AudienceKind; label: string }[] {
  if (user.role === 'Administrator') {
    return (['ALL', 'ROLE', 'DEPARTMENT', 'COURSE'] as const).map(value => ({
      value,
      label: value === 'DEPARTMENT' ? 'A department' : LABELS[value],
    }))
  }
  const kinds: AudienceKind[] = user.role === 'Staff' ? ['DEPARTMENT', 'COURSE'] : ['COURSE']
  return kinds.map(value => ({ value, label: LABELS[value] }))
}

/** Builds the `audience` of POST /notifications: "ALL", "ROLE:Student", "DEPARTMENT:...", "COURSE:<code>". */
export function buildAudience(kind: AudienceKind, value: string): string {
  return kind === 'ALL' ? 'ALL' : `${kind}:${value.trim()}`
}

/** Human-readable audience of a sent announcement. */
export function describeAudience(audience: string): string {
  if (audience === 'ALL') return 'All users'
  if (audience === 'USERS') return 'Selected users'
  const [kind, ...rest] = audience.split(':')
  const value = rest.join(':')
  if (kind === 'ROLE') return `${value} role`
  if (kind === 'DEPARTMENT') return value
  if (kind === 'COURSE') return `Course ${value}`
  return audience
}
