/**
 * heroThemes.js — Single source of truth for Hero element colours.
 *
 * Drives CSS custom properties that colour the wordmark, nav bubbles, and
 * name tag. `HERO_REST` is the at-rest look (cream elements on the cobalt
 * field). `HERO_HOVER` previews each destination section and is applied
 * together with the gradient field shift (a later task).
 *
 * Rule: light field → dark elements; dark field → light elements.
 * Keys in HERO_HOVER are SECTIONS indices (1=About,2=Projects,3=Gallery,4=Contact).
 */
const CREAM = '245, 240, 232'
const COBALT = '27, 58, 140'
const NEAR_BLACK = '10, 10, 14'
const WHITE = '255, 255, 255'

// At rest the blobs are frosted glass over the cobalt field, so the label is
// white (was cobalt). Hover-preview states keep their per-section text colours.
export const HERO_REST = { wordmark: CREAM, bubbleFill: CREAM, bubbleText: WHITE, name: CREAM }

export const HERO_HOVER = {
  1: { wordmark: CREAM,  bubbleFill: CREAM,  bubbleText: COBALT,     name: CREAM },  // About — dark field
  2: { wordmark: COBALT, bubbleFill: COBALT, bubbleText: CREAM,      name: COBALT }, // Projects — light field
  3: { wordmark: CREAM,  bubbleFill: CREAM,  bubbleText: NEAR_BLACK, name: CREAM },  // Gallery — dark field
  4: { wordmark: CREAM,  bubbleFill: CREAM,  bubbleText: NEAR_BLACK, name: CREAM },  // Contact — dark field
}

/** Apply a theme's colours to documentElement as --hero-* custom properties. */
export function applyHeroTheme(theme) {
  const el = document.documentElement
  el.style.setProperty('--hero-wordmark', `rgb(${theme.wordmark})`)
  // Triple form too, so the glass-look heading can compose a translucent fill
  // (rgba(var(--hero-wordmark-rgb), a)) the way the name tag does.
  el.style.setProperty('--hero-wordmark-rgb', theme.wordmark)
  el.style.setProperty('--hero-bubble-fill', `rgb(${theme.bubbleFill})`)
  el.style.setProperty('--hero-bubble-text', `rgb(${theme.bubbleText})`)
  el.style.setProperty('--hero-name-rgb', theme.name)
}

export function clearHeroTheme() {
  const el = document.documentElement
  for (const v of ['--hero-wordmark', '--hero-wordmark-rgb', '--hero-bubble-fill', '--hero-bubble-text', '--hero-name-rgb'])
    el.style.removeProperty(v)
}
