import { useEffect } from 'react'
import { useMotionValue } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'

/**
 * Custom hook to track scroll progress over a specific container.
 * @param {React.RefObject} containerRef - Ref to the section container (usually the tall scrolling wrapper).
 * @param {number} activeHeight - The total scroll distance (in pixels) over which progress goes from 0 to 1.
 * @returns {import('framer-motion').MotionValue} progress - A MotionValue between 0 and 1.
 */
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
        
        // Use the provided activeHeight, or fallback to the element's clientHeight minus 1 window height
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
