/**
 * useMediaQuery.js — Reactive Media Query Hook
 *
 * Returns true when the given media query matches, and re-renders
 * on viewport changes. Used to branch scroll choreography and grid
 * layouts between mobile and desktop.
 */
import { useCallback, useSyncExternalStore } from 'react'

export default function useMediaQuery(query) {
  const subscribe = useCallback(
    (onStoreChange) => {
      const mql = window.matchMedia(query)
      mql.addEventListener('change', onStoreChange)
      return () => mql.removeEventListener('change', onStoreChange)
    },
    [query]
  )

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false
  )
}
