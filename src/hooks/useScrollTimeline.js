/**
 * useScrollTimeline.js — Section Scroll Progress Hook
 *
 * Tracks how far the user has scrolled through a specific section,
 * returning a MotionValue that ranges from 0 (section top at viewport top)
 * to 1 (section fully scrolled past).
 *
 * Used by Projects and Gallery to drive scroll-linked animations
 * (card transforms, halftone waves, entry/exit sequences).
 *
 * @param {React.RefObject} containerRef - Ref to the tall scrolling wrapper (e.g. 400vh div).
 * @param {number} activeHeight - Total scroll distance (px) over which progress goes 0→1.
 * @returns {import('framer-motion').MotionValue<number>} progress — clamped to [0, 1].
 */
import { useEffect } from 'react'
import { useMotionValue } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'

export default function useScrollTimeline(containerRef, activeHeight) {
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
        
        // Use the provided activeHeight, or fallback to element height minus one viewport
        const height = activeHeight || Math.max(1, el.clientHeight - window.innerHeight)
        
        const raw = (scroll - el.offsetTop) / height
        progress.set(Math.max(0, Math.min(1, raw)))
      }

      const onScroll = ({ scroll }) => calc(scroll)
      calc(lenis.scroll ?? window.scrollY)
      
      lenis.on('scroll', onScroll)
      unlisten = () => lenis.off('scroll', onScroll)
    }, 0)

    return () => { 
      clearTimeout(t)
      unlisten() 
    }
  }, [lenisRef, progress, activeHeight, containerRef])

  return progress
}
