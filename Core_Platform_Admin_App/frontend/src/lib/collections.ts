/** List endpoints may return a plain array or an `{ items: [...] }` envelope. */
export type ListResponse<T> = T[] | { items: T[] }

export function toList<T>(data: ListResponse<T> | null): T[] {
  if (Array.isArray(data)) return data
  return Array.isArray(data?.items) ? data.items : []
}

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
