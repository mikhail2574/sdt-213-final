import { useCallback, useEffect, useState, type DependencyList } from 'react'

export interface AsyncState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
  reload: () => void
  setData: (update: T | ((previous: T | undefined) => T)) => void
}

/**
 * Runs `loader` whenever `deps` change and tracks its result.
 * Responses that arrive after the deps changed again are ignored.
 */
export default function useAsync<T>(loader: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setDataState] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | null>(null)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    let active = true
    setLoading(true)
    setError(null)
    loader()
      .then(result => {
        if (active) setDataState(result)
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err : new Error(String(err)))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
    // The caller controls when to reload through `deps`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, version])

  const reload = useCallback(() => setVersion(value => value + 1), [])
  const setData = useCallback((update: T | ((previous: T | undefined) => T)) => {
    setDataState(previous => (typeof update === 'function' ? (update as (p: T | undefined) => T)(previous) : update))
  }, [])

  return { data, error, loading, reload, setData }
}
