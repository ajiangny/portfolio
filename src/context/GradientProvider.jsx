/**
 * GradientProvider.jsx — Provider component for GradientContext.
 *
 * Kept in a separate file from GradientContext.js so this file only
 * exports a component — required for Fast Refresh.
 */
import { useCallback, useRef } from 'react'
import { GradientContext } from './GradientContext'

export function GradientProvider({ children }) {
  const signalsRef = useRef({})

  const register = useCallback((key, mv) => {
    signalsRef.current[key] = mv
    return () => {
      if (signalsRef.current[key] === mv) delete signalsRef.current[key]
    }
  }, [])

  return (
    <GradientContext.Provider value={{ signalsRef, register }}>
      {children}
    </GradientContext.Provider>
  )
}
