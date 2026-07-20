/**
 * LenisContext.ts — Smooth Scroll Context
 *
 * Creates a React context that holds a ref to the Lenis smooth-scroll
 * instance. Any component can call `useLenisContext()` to access
 * `lenisRef.current` for programmatic scrolling (e.g. `lenis.scrollTo()`).
 */
import { createContext, useContext, type RefObject } from 'react'
import type Lenis from 'lenis'

export type LenisRef = RefObject<Lenis | null>

export const LenisContext = createContext<LenisRef | null>(null)
export const useLenisContext = () => useContext(LenisContext)
