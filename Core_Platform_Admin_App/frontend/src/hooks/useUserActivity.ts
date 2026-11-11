import { useCallback, useEffect, useRef } from 'react'

const EVENTS = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const

/**
 * Tracks the time of the user's last interaction. Background requests (polling) use it to stop
 * when the user is idle, so they do not keep the server session alive (NFR7 idle timeout).
 * Returns a function telling whether the user interacted within `idleAfterMs`.
 */
export default function useUserActivity(idleAfterMs: number): () => boolean {
  const lastActivity = useRef(Date.now())

  useEffect(() => {
    const mark = () => {
      lastActivity.current = Date.now()
    }
    EVENTS.forEach(name => window.addEventListener(name, mark, { passive: true }))
    return () => EVENTS.forEach(name => window.removeEventListener(name, mark))
  }, [])

  return useCallback(() => Date.now() - lastActivity.current < idleAfterMs, [idleAfterMs])
}
