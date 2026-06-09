/**
 * TransitionContext.jsx — Page Transition State
 *
 * Provides a blob-expand navigation effect shared across the entire app.
 * When `navigate()` is called, it:
 *   1. Records the click position for the expand origin
 *   2. Sets the transition color (section-specific)
 *   3. Activates the blob (PageTransition renders the expanding circle)
 *   4. After the blob covers the screen (600ms), performs an instant
 *      Lenis scroll jump to the target section
 *   5. Shrinks the blob to reveal the new section
 */
import { createContext, useContext, useState, useRef, useCallback } from 'react'
import { useLenisContext } from './LenisContext'

const TransitionContext = createContext()

export function TransitionProvider({ children }) {
  const [isActive, setIsActive] = useState(false)
  const [clickPos, setClickPos] = useState({ x: 0, y: 0 })
  const [transitionColor, setTransitionColor] = useState('var(--color-cobalt)')
  const lenisRef = useLenisContext()
  const isTransitioning = useRef(false)

  const navigate = useCallback((href, options = {}, e = null, colorStr = null) => {
    if (isTransitioning.current) return
    isTransitioning.current = true

    // Set the blob's fill color — each section has a themed color
    if (colorStr) {
      setTransitionColor(colorStr)
    } else {
      setTransitionColor('var(--color-cobalt)')
    }

    // Resolve click coordinates for the expand origin
    let clientX
    let clientY

    if (e) {
      clientX = e.clientX ?? e.touches?.[0]?.clientX ?? e.nativeEvent?.clientX
      clientY = e.clientY ?? e.touches?.[0]?.clientY ?? e.nativeEvent?.clientY
    }

    if (clientX !== undefined && clientY !== undefined) {
      setClickPos({ x: clientX, y: clientY })
    } else {
      setClickPos({ x: window.innerWidth / 2, y: window.innerHeight / 2 })
    }

    setIsActive(true)

    // Phase 1: Wait for blob to fully expand (600ms CSS transition)
    setTimeout(() => {
      // Instant jump while the blob hides the page
      lenisRef?.current?.scrollTo(href, { ...options, immediate: true, duration: 0 })

      // Phase 2: Brief pause for DOM to settle, then shrink the blob
      setTimeout(() => {
        setIsActive(false)
        
        // Phase 3: Unlock after exit animation completes (600ms)
        setTimeout(() => {
          isTransitioning.current = false
        }, 600)
      }, 50)
    }, 600) 
  }, [lenisRef])

  return (
    <TransitionContext.Provider value={{ isActive, navigate, clickPos, transitionColor }}>
      {children}
    </TransitionContext.Provider>
  )
}

export function useTransitionContext() {
  return useContext(TransitionContext)
}
