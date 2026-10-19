/**
 * riot.ts — Shared primitives for the site's "riot" visual system
 *
 * The site-wide style borrows the *mechanics* of the Persona 5 UI (not its
 * look): three flat colours with fixed jobs, everything on a tilted axis, no
 * plain rectangles, selection as a costume change, fast overshooting motion,
 * depth from stacked flat layers. Every component pulls its colours, shapes
 * and motion from here so the rules stay consistent.
 *
 * ARCHITECTURE.md § "Riot style" maps each rule to the files that apply it.
 */

// ── Rule 1: three flat colours, each with one job ──
// field = the background plane · face = the "selected"/foreground surface ·
// ink = shadows, outlines, inverted letters. CSS vars live in index.css @theme.
export const RIOT = {
  cobalt: 'var(--color-riot)',      // primary field (saturated cobalt)
  cobaltDeep: 'var(--color-riot-deep)',
  face: 'var(--color-cream)',
  ink: 'var(--color-slab)',
} as const

// ── Rule 2: one tilted axis ──
export const TILT = -6 // deg; headings, bands and menus lean on this baseline

// ── Rule 5: fast motion that overshoots, then holds still ──
export const SNAP = { type: 'spring', stiffness: 700, damping: 32, mass: 0.6 } as const
export const ENTER_EASE = [0.2, 1.4, 0.4, 1] as const // cubic-bezier with overshoot
export const WIPE_EASE = [0.7, 0, 0.2, 1] as const    // hard in-out for slashes/wipes

// Tiny seeded PRNG so a given element always gets the same jagged shape and
// the same ransom letters for a given seed (no flicker on re-render).
export function rng(seed: number) {
  let t = seed >>> 0
  return () => {
    t = (t + 0x6d2b79f5) >>> 0
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}

// ── Rule 3: no plain rectangles ──
// A quad whose four corners are nudged inward by up to `amt`% of the box.
// Good for small things (tags, letters, buttons) where % stays a few px.
export function jagged(seed: number, amt = 6) {
  const r = rng(seed)
  const j = () => (r() * amt).toFixed(1)
  return `polygon(${j()}% ${j()}%, ${100 - +j()}% ${j()}%, ${100 - +j()}% ${100 - +j()}%, ${j()}% ${100 - +j()}%)`
}

// Same idea in px, for big panels where a % nudge would eat the content.
export function jaggedPx(seed: number, amt = 12) {
  const r = rng(seed)
  const j = () => Math.round(r() * amt)
  return `polygon(${j()}px ${j()}px, calc(100% - ${j()}px) ${j()}px, calc(100% - ${j()}px) calc(100% - ${j()}px), ${j()}px calc(100% - ${j()}px))`
}
