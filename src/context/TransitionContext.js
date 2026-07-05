/**
 * TransitionContext.js — Page Transition Context + Hook
 *
 * Holds the blur/ink-dissolve navigation state shared across the app.
 * The provider component lives in TransitionProvider.jsx (kept separate
 * so this file only exports non-components — required for Fast Refresh).
 *
 * Consumers call `useTransitionContext()` for:
 *   • navigate(href, options, colorStr) — run the veil transition
 *   • isActive — true while the veil covers the screen
 *   • transitionColor — read by PageTransition to tint the veil
 */
import { createContext, useContext } from 'react'

export const TransitionContext = createContext(null)

export function useTransitionContext() {
  return useContext(TransitionContext)
}
