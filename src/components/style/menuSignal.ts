/**
 * menuSignal.ts — lets anything open the StyleMenu without prop drilling
 * (SiteHeader's mobile monogram uses it). Same idea as gradient/hoverSignal.
 */
const listeners = new Set<() => void>()

export function openMenu() {
  listeners.forEach((fn) => fn())
}

/** Subscribe; returns the unsubscribe function (usable as an effect cleanup). */
export function onMenuOpen(fn: () => void) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}
