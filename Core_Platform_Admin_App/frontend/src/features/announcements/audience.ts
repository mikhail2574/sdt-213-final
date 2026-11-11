export type AudienceKind = 'ALL' | 'ROLE' | 'DEPARTMENT'

export const AUDIENCE_KINDS: { value: AudienceKind; label: string }[] = [
  { value: 'ALL', label: 'All users' },
  { value: 'ROLE', label: 'A role' },
  { value: 'DEPARTMENT', label: 'A department' },
]

/** Builds the `audience` string of POST /notifications: "ALL", "ROLE:Student", "DEPARTMENT:...". */
export function buildAudience(kind: AudienceKind, value: string): string {
  return kind === 'ALL' ? 'ALL' : `${kind}:${value.trim()}`
}
