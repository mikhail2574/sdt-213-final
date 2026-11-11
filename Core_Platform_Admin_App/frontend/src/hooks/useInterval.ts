import { useEffect, useRef } from 'react'

/** Calls `callback` every `delay` ms; pass `null` to pause. */
export default function useInterval(callback: () => void, delay: number | null): void {
  const saved = useRef(callback)

  useEffect(() => {
    saved.current = callback
  }, [callback])

  useEffect(() => {
    if (delay === null) return undefined
    const timer = setInterval(() => saved.current(), delay)
    return () => clearInterval(timer)
  }, [delay])
}
