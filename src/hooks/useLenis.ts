/**
 * useLenis.ts — Smooth Scroll Hook
 *
 * Initialises a Lenis smooth-scroll instance and keeps it alive
 * for the lifetime of the component that calls the hook.
 * Returns a ref so callers can access `lenisRef.current.scrollTo()`.
 *
 * Configuration:
 *   • easeOutExpo easing for a snappy-then-smooth feel
 *   • Vertical orientation only
 *   • Touch multiplier of 2 for responsive mobile scrolling
 */
import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

export default function useLenis() {
  const lenisRef = useRef<Lenis | null>(null)

  useEffect(() => {
    // Prevent the browser from restoring the previous scroll position on reload.
    history.scrollRestoration = 'manual'
    window.scrollTo(0, 0)

    // Respect reduced-motion: keep Lenis (sections rely on its scroll events)
    // but let the browser scroll natively instead of smoothing.
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: !prefersReducedMotion,
      touchMultiplier: 2,
    })

    lenisRef.current = lenis

    // Drive the Lenis scroll loop via requestAnimationFrame
    let rafId: number
    function raf(time: number) {
      lenis.raf(time)
      rafId = requestAnimationFrame(raf)
    }
    rafId = requestAnimationFrame(raf)

    return () => {
      cancelAnimationFrame(rafId)
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return lenisRef
}
