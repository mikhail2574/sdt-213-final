/** Returns only the keys of `next` whose values differ from `original` (for PATCH requests). */
export function changedFields<T extends object>(original: Partial<T>, next: T): Partial<T> {
  const changes: Partial<T> = {}
  for (const key of Object.keys(next) as (keyof T)[]) {
    if ((original[key] ?? '') !== (next[key] ?? '')) changes[key] = next[key]
  }
  return changes
}

export function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) => a.localeCompare(b))
}
