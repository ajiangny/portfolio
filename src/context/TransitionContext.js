/**
 * TransitionContext.js — Page Transition Context + Hook
 *
 * Holds the blob-expand navigation state shared across the app.
 * The provider component lives in TransitionProvider.jsx (kept separate
 * so this file only exports non-components — required for Fast Refresh).
 *
 * Consumers call `useTransitionContext()` for:
 *   • navigate(href, options, event, colorStr) — run the blob transition
 *   • isActive — true while the curtain covers the screen
 *   • clickPos / transitionColor — read by PageTransition to render the blob
 */
import { createContext, useContext } from 'react'

export const TransitionContext = createContext(null)

export function useTransitionContext() {
  return useContext(TransitionContext)
}
