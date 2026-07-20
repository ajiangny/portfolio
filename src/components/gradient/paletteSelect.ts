// src/components/gradient/paletteSelect.ts
// Pure: choose the active section palette by viewport centre and crossfade
// toward the next once the section's progress passes seamFade.
import { lerp3, type Vec3 } from './colors'
import type { SectionPalette } from './gradientConfig'

export interface SectionRect {
  top: number
  bottom: number
  height: number
}

export interface SelectedPalette {
  base0: Vec3
  base1: Vec3
  ink: Vec3
  energy: number
}

/**
 * @param rects aligned to `order`
 * @param centerY viewport-centre y (same coord space as rect top/bottom)
 * @param order section ids in document order
 * @param palettes per-section palettes
 * @param seamFade progress at which crossfade begins
 */
export function selectPalette(
  rects: Array<SectionRect | null>,
  centerY: number,
  order: string[],
  palettes: Record<string, SectionPalette>,
  seamFade: number,
): SelectedPalette {
  let idx = 0
  let through = 0
  for (let i = 0; i < order.length; i++) {
    const r = rects[i]
    if (!r) continue
    if (r.top <= centerY && centerY < r.bottom) {
      idx = i
      through = r.height > 0 ? (centerY - r.top) / r.height : 0
      break
    }
    if (centerY >= r.bottom) idx = i
  }
  const cur = palettes[order[idx]]
  const nxt = palettes[order[Math.min(idx + 1, order.length - 1)]]
  const mix = through > seamFade ? (through - seamFade) / (1 - seamFade) : 0
  const curE = cur.energy ?? 1
  const nxtE = nxt.energy ?? 1
  return {
    base0: lerp3(cur.base[0], nxt.base[0], mix),
    base1: lerp3(cur.base[1], nxt.base[1], mix),
    ink: lerp3(cur.ink, nxt.ink, mix),
    energy: curE + (nxtE - curE) * mix,
  }
}
