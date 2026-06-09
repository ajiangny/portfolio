/**
 * LenisContext.js — Smooth Scroll Context
 *
 * Creates a React context that holds a ref to the Lenis smooth-scroll
 * instance. Any component can call `useLenisContext()` to access
 * `lenisRef.current` for programmatic scrolling (e.g. `lenis.scrollTo()`).
 */
import { createContext, useContext } from 'react'

export const LenisContext = createContext(null)
export const useLenisContext = () => useContext(LenisContext)
