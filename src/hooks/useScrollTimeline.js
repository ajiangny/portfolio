/**
 * useScrollTimeline.js — Section Scroll Progress Hook
 *
 * Tracks how far the user has scrolled through a specific section,
 * returning a MotionValue that ranges from 0 (section top at viewport top)
 * to 1 (the section's sticky viewport unpins).
 *
 * Used by Projects and Gallery to drive scroll-linked animations
 * (card transforms, gradient signals, entry/exit sequences).
 *
 * @param {React.RefObject} containerRef - Ref to the tall scrolling wrapper (e.g. 400vh div).
 * @param {number} [activeVh] - Scroll travel in viewport-heights over which progress
 *   runs 0→1. For a sticky top-0 h-screen child this is (container height − 100vh),
 *   e.g. 3 for a 400vh container. Re-read on every tick so orientation changes and
 *   mobile URL-bar resizes stay accurate. Omit to derive from the container's height.
 * @returns {import('framer-motion').MotionValue<number>} progress — clamped to [0, 1].
 */
import { useEffect } from 'react'
import { useMotionValue } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'

export default function useScrollTimeline(containerRef, activeVh) {
  const lenisRef = useLenisContext()
  const progress = useMotionValue(0)

  useEffect(() => {
    let unlisten = () => {}

    // Slight timeout to ensure layout has settled before calculating offsets
    const t = setTimeout(() => {
      const lenis = lenisRef?.current
      if (!lenis) return

      const calc = (scroll) => {
        const el = containerRef.current
        if (!el) return

        const height = activeVh
          ? activeVh * window.innerHeight
          : Math.max(1, el.clientHeight - window.innerHeight)

        const raw = (scroll - el.offsetTop) / height
        progress.set(Math.max(0, Math.min(1, raw)))
      }

      const onScroll = ({ scroll }) => calc(scroll)
      const onResize = () => calc(lenis.scroll ?? window.scrollY)
      // Native fallback: Lenis doesn't emit for scrolls it didn't drive
      // (keyboard paging, anchor/programmatic jumps).
      const onNativeScroll = () => calc(window.scrollY)
      calc(lenis.scroll ?? window.scrollY)

      lenis.on('scroll', onScroll)
      window.addEventListener('scroll', onNativeScroll, { passive: true })
      window.addEventListener('resize', onResize)
      unlisten = () => {
        lenis.off('scroll', onScroll)
        window.removeEventListener('scroll', onNativeScroll)
        window.removeEventListener('resize', onResize)
      }
    }, 0)

    return () => {
      clearTimeout(t)
      unlisten()
    }
  }, [lenisRef, progress, activeVh, containerRef])

  return progress
}
