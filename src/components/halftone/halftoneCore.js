/**
 * halftoneCore.js — Shared Halftone Canvas Primitives
 *
 * Pure helpers used by HalftoneCanvas (and the Hero's bespoke
 * HalftoneBg): grid alignment, offscreen base-layer pre-render, and
 * the sprite sheets that let draw loops blit pre-rendered dots instead
 * of issuing thousands of arc() calls per frame.
 *
 * Grid conventions (shared by every halftone in the site so the dot
 * pattern lines up seamlessly across section boundaries):
 *   • GRID px between dot centres
 *   • cells span (col-1)*GRID horizontally and (row-1)*GRID - offsetY
 *     vertically, with one buffer row/col on each side
 *   • offsetY = (section's document offsetTop) % GRID, so a canvas that
 *     starts mid-page still draws dots on the same global lattice
 */

export const GRID = 18            // px between dot centres
export const LEVELS = 60          // sprite-sheet intensity levels
export const HALF_CELL = GRID / 2 - 0.5
export const HOVER_R = 160        // cursor influence radius (px)
export const HOVER_R2 = HOVER_R * HOVER_R

/** rgba() strings for a colour at every opacity 0.00–1.00. */
export function buildFillCache(colorRgb) {
  return Array.from({ length: 101 }, (_, i) =>
    `rgba(${colorRgb},${(i / 100).toFixed(2)})`
  )
}

/**
 * Walk offsetParents to find a section's absolute document top, mod GRID.
 * Aligns this canvas's dots with the global page lattice.
 */
export function computeGlobalOffsetY(containerId) {
  if (!containerId) return 0
  const el = document.getElementById(containerId)
  if (!el) return 0
  let current = el
  let top = 0
  while (current) {
    top += current.offsetTop
    current = current.offsetParent
  }
  return top % GRID
}

/** Offscreen canvas with the resting dot grid (uniform radius/opacity). */
export function buildUniformBase(W, H, { offsetY, radius, fillCache, baseOpacity }) {
  const cols = Math.ceil(W / GRID) + 2
  const rows = Math.ceil(H / GRID) + 2

  const offCanvas = document.createElement('canvas')
  offCanvas.width = W
  offCanvas.height = H
  const offCtx = offCanvas.getContext('2d')

  const oi = Math.round(Math.min(0.99, baseOpacity) * 100)
  offCtx.fillStyle = fillCache[oi]
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = (col - 1) * GRID
      const cy = (row - 1) * GRID - offsetY
      offCtx.beginPath()
      offCtx.arc(cx, cy, radius, 0, Math.PI * 2)
      offCtx.fill()
    }
  }
  return { offCanvas, cols, rows }
}

/**
 * Sprite sheets for boosted dots:
 *   • spriteCanvas — one dot per intensity level (LEVELS × GRID strip),
 *     blitted for individually-sized dots (hover, radial effects)
 *   • rowSpriteCanvas — a full row of dots per level, blitted for rows
 *     whose intensity is uniform (wave fronts, line bands)
 */
export function buildSpriteSheets(cols, { fillCache, baseRadius, baseOpacity, hoverBoost }) {
  const spriteCanvas = document.createElement('canvas')
  spriteCanvas.width = LEVELS * GRID
  spriteCanvas.height = GRID
  const sCtx = spriteCanvas.getContext('2d')

  const rowSpriteCanvas = document.createElement('canvas')
  rowSpriteCanvas.width = cols * GRID
  rowSpriteCanvas.height = LEVELS * GRID
  const rsCtx = rowSpriteCanvas.getContext('2d')

  for (let lvl = 0; lvl < LEVELS; lvl++) {
    const inf = lvl / (LEVELS - 1)
    const finalRadius = Math.min(baseRadius + hoverBoost * inf, HALF_CELL)
    const oi = Math.round(Math.min(0.99, baseOpacity + inf * 0.5) * 100)

    sCtx.beginPath()
    sCtx.arc(lvl * GRID + GRID / 2, GRID / 2, finalRadius, 0, Math.PI * 2)
    sCtx.fillStyle = fillCache[oi]
    sCtx.fill()

    rsCtx.fillStyle = fillCache[oi]
    const sy = lvl * GRID
    for (let col = 0; col < cols; col++) {
      rsCtx.beginPath()
      rsCtx.arc(col * GRID + GRID / 2, sy + GRID / 2, finalRadius, 0, Math.PI * 2)
      rsCtx.fill()
    }
  }
  return { spriteCanvas, rowSpriteCanvas }
}

/** Clamp an influence (0–1) to a sprite-sheet level index. */
export function influenceToLevel(inf) {
  return Math.max(0, Math.min(LEVELS - 1, Math.round(inf * (LEVELS - 1))))
}
