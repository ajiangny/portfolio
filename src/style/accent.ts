/**
 * accent.ts — the per-project accent (Projects colour coding).
 *
 * While a project card holds the middle of the screen, its `accent` replaces
 * the riot cobalt everywhere at once: setAccent() overrides --color-riot on
 * <html> (CSS uses it for shadows, the nav indicator, buttons, tiles; the
 * registered @property in index.css makes the swap animate), and the fluid
 * background reads `accentSignal` each frame to recolour the Projects ink.
 * setAccent(null) hands everything back to cobalt.
 */
import type { Vec3 } from '../components/gradient/colors'

export const accentSignal: { rgb: Vec3 | null } = { rgb: null }

let current: string | null = null

const hexToVec3 = (hex: string): Vec3 => {
  const n = parseInt(hex.slice(1), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function setAccent(hex: string | null) {
  if (hex === current) return
  current = hex
  accentSignal.rgb = hex ? hexToVec3(hex) : null
  const root = document.documentElement.style
  if (hex) root.setProperty('--color-riot', hex)
  else root.removeProperty('--color-riot')
}
