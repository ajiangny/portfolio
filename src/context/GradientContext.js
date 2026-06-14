/**
 * GradientContext.js — Decoupled registry for the gradient's scroll signals.
 *
 * Sections register the MotionValues that drive transitions (seam/flood/
 * pulse) without the gradient importing section internals. FluidGradient
 * reads signalsRef.current[key].get() each frame; missing keys default to 0.
 *
 * Context + hooks live here (non-components); the provider component lives in
 * GradientProvider.jsx — required for Fast Refresh.
 */
import { createContext, useContext, useEffect } from 'react'

export const GradientContext = createContext(null)

export function useGradientSignals() {
  return useContext(GradientContext)
}

/** Register a MotionValue under `key` for the lifetime of the caller. */
export function useGradientSignal(key, motionValue) {
  const ctx = useContext(GradientContext)
  useEffect(() => {
    if (!ctx || !motionValue) return
    return ctx.register(key, motionValue)
  }, [ctx, key, motionValue])
}
