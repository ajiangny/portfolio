// src/components/gradient/paletteSelect.js
// Pure: choose the active section palette by viewport centre and crossfade
// toward the next once the section's progress passes seamFade.
import { lerp3 } from './colors.js'

/**
 * @param {Array<{top:number,bottom:number,height:number}|null>} rects aligned to `order`
 * @param {number} centerY viewport-centre y (same coord space as rect top/bottom)
 * @param {string[]} order section ids in document order
 * @param {Record<string,{base:[number[],number[]],ink:number[]}>} palettes
 * @param {number} seamFade progress at which crossfade begins
 * @returns {{base0:number[], base1:number[], ink:number[]}}
 */
export function selectPalette(rects, centerY, order, palettes, seamFade) {
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
  return {
    base0: lerp3(cur.base[0], nxt.base[0], mix),
    base1: lerp3(cur.base[1], nxt.base[1], mix),
    ink: lerp3(cur.ink, nxt.ink, mix),
  }
}
