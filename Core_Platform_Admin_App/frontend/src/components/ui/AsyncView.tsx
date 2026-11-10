import type { ReactNode } from 'react'
import Alert from './Alert'
import Loader from './Loader'

interface AsyncState<T> {
  data: T | undefined
  error: Error | null
  loading: boolean
}

interface AsyncViewProps<T> {
  state: Pick<AsyncState<T>, 'data' | 'error' | 'loading'>
  children: (data: T) => ReactNode
  loadingLabel?: string
}

/** Renders a loader, an error or the loaded data. Keeps showing old data while reloading. */
export default function AsyncView<T>({ state, children, loadingLabel }: AsyncViewProps<T>) {
  if (state.error) return <Alert>{state.error.message}</Alert>
  if (state.data === undefined) return state.loading ? <Loader label={loadingLabel} /> : null
  return <>{children(state.data)}</>
}
