/**
 * TransitionProvider.jsx — Page Transition State Provider
 *
 * Provides a blur/ink-dissolve navigation effect shared across the entire app.
 * When `navigate()` is called, it:
 *   1. Sets the transition color (section-specific)
 *   2. Activates the veil (PageTransition blurs + dissolves over the page)
 *   3. After the veil covers the screen (600ms), performs an instant
 *      Lenis scroll jump to the target section
 *   4. Dissolves the veil away to reveal the new section
 */
import { useState, useRef, useCallback } from 'react'
import { TransitionContext } from './TransitionContext'
import { useLenisContext } from './LenisContext'

export function TransitionProvider({ children }) {
  const [isActive, setIsActive] = useState(false)
  const [transitionColor, setTransitionColor] = useState('var(--color-cobalt)')
  const lenisRef = useLenisContext()
  const isTransitioning = useRef(false)

  const navigate = useCallback((href, options = {}, colorStr = null) => {
    if (isTransitioning.current) return
    isTransitioning.current = true

    // Set the veil's tint — each section has a themed color
    setTransitionColor(colorStr || 'var(--color-cobalt)')

    setIsActive(true)

    // Phase 1: Wait for the veil to fully cover (600ms)
    setTimeout(() => {
      // Instant jump while the veil hides the page
      lenisRef?.current?.scrollTo(href, { ...options, immediate: true, duration: 0 })

      // Phase 2: Brief pause for DOM to settle, then dissolve the veil
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
    <TransitionContext.Provider value={{ isActive, navigate, transitionColor }}>
      {children}
    </TransitionContext.Provider>
  )
}
