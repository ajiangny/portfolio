/**
 * TransitionContext.ts — Page Transition Context + Hook
 *
 * Holds the blur/ink-dissolve navigation state shared across the app.
 * The provider component lives in TransitionProvider.tsx (kept separate
 * so this file only exports non-components — required for Fast Refresh).
 *
 * Consumers call `useTransitionContext()` for:
 *   • navigate(href, options, colorStr) — run the veil transition
 *   • isActive — true while the veil covers the screen
 *   • transitionColor — read by PageTransition to tint the veil
 */
import { createContext, useContext } from 'react'
import type { NavigateFn } from '../config/sections'

export interface TransitionContextValue {
  isActive: boolean
  navigate: NavigateFn
  transitionColor: string
}

export const TransitionContext = createContext<TransitionContextValue | null>(null)

export function useTransitionContext() {
  // The provider wraps the entire app in main.tsx, so consumers never see null.
  return useContext(TransitionContext) as TransitionContextValue
}
