/**
 * useLenis.js — Smooth Scroll Hook
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
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // easeOutExpo
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      touchMultiplier: 2,
    })

    lenisRef.current = lenis

    // Drive the Lenis scroll loop via requestAnimationFrame
    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }
    requestAnimationFrame(raf)

    return () => {
      lenis.destroy()
      lenisRef.current = null
    }
  }, [])

  return lenisRef
}
