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

    if (colorStr) {
      setTransitionColor(colorStr)
    } else {
      setTransitionColor('var(--color-cobalt)')
    }

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

    // Wait for blob to expand (600ms)
    setTimeout(() => {
      // Jump instantly while hidden
      lenisRef?.current?.scrollTo(href, { ...options, immediate: true, duration: 0 })

      // Wait a tiny bit for DOM layout to settle, then shrink blob
      setTimeout(() => {
        setIsActive(false)
        
        // Unlock after exit animation (600ms)
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

