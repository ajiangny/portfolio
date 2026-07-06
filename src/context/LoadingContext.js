/**
 * LoadingContext.js — Site Loading State
 *
 * A simple shared signal so FluidGradient can tell the LoadingScreen
 * when the WebGL prewarm is done. The loading screen waits for both
 * this signal and `document.fonts.ready` before dissolving away.
 */
import { createContext, useContext } from 'react'

export const LoadingContext = createContext({ onReady: () => {} })
export const useLoadingContext = () => useContext(LoadingContext)
