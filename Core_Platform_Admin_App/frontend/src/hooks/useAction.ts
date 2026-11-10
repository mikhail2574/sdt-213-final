import { useCallback, useState } from 'react'
import { errorMessage } from '../lib/format'

/**
 * Wraps a submit or click handler with busy and error state.
 * `run` resolves to the action's result, or `undefined` when it failed.
 */
export default function useAction<Args extends unknown[], Result>(action: (...args: Args) => Promise<Result>) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const run = useCallback(
    async (...args: Args): Promise<Result | undefined> => {
      setBusy(true)
      setError('')
      try {
        return await action(...args)
      } catch (err) {
        setError(errorMessage(err))
        return undefined
      } finally {
        setBusy(false)
      }
    },
    [action],
  )

  return { run, busy, error, setError }
}
