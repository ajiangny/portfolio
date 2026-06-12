/**
 * halftoneStrategies.js — Per-Variant Draw Strategies
 *
 * Each strategy paints one frame of "dynamic" dots on top of the resting
 * base layer (already drawn by HalftoneCanvas). They are exact ports of
 * the section-specific draw loops, so each section keeps its distinct
 * effect while sharing one engine:
 *
 *   • waveUpStrategy    — bottom-up wave front (About backgrounds)
 *   • radialLineStrategy — radial wave from centre + horizontal line
 *                          band (Projects; line = About→Projects seam)
 *   • pulseLineStrategy — expanding pulse ring + pixel progress line
 *                          (Gallery / Contact)
 *
 * A strategy receives a frame object:
 *   { ctx, w, h, cols, rows, globalOffsetY, spriteCanvas, rowSpriteCanvas,
 *     extra, hover: { mx, my, strength }, values }
 * `values` holds the numeric effect inputs for this frame (motion values
 * already unwrapped). `extra` is per-strategy precomputed data attached
 * by the strategy's optional `onBuild(extra, W, H, cols, rows, offsetY)`.
 *
 * Hover dots use the shared sprite sheet; every influence is the max of
 * the active effects at that dot, mapped to a sprite level.
 */
import { GRID, LEVELS, HOVER_R, HOVER_R2, influenceToLevel } from './halftoneCore'

// ─── Bottom-up wave (About) ──────────────────────────────────────────────────
export function waveUpStrategy(f) {
  const { ctx, h, cols, rows, globalOffsetY, spriteCanvas, rowSpriteCanvas, hover, values } = f
  const waveFront = values.waveFront ?? 0
  const waveHeight = values.waveHeight ?? 0.15
  const { mx, my, strength: hoverStrength } = hover

  let startRow = rows
  let endRow = -1

  if (hoverStrength > 0) {
    startRow = Math.min(startRow, Math.max(0, Math.floor((my - HOVER_R) / GRID)))
    endRow = Math.max(endRow, Math.min(rows - 1, Math.ceil((my + HOVER_R) / GRID)))
  }

  // The wave travels up to waveHeight of the screen height from the bottom
  let waveY = h + 100
  if (waveFront > 0) {
    waveY = h * (1 - waveFront)
    startRow = Math.min(startRow, Math.max(0, Math.floor(waveY / GRID)))
    endRow = Math.max(endRow, rows - 1)
  }

  for (let row = startRow; row <= endRow; row++) {
    const rowY = (row - 1) * GRID - globalOffsetY

    let waveInf = 0
    if (waveFront > 0) {
      const normalizedY = 1 - (rowY / h)
      const depth = waveFront - normalizedY
      waveInf = Math.max(0, Math.min(1, depth / waveHeight))
    }

    let startCol = 0
    let endCol = cols - 1

    if (waveFront === 0 || rowY < waveY) {
      startCol = Math.max(0, Math.floor((mx - HOVER_R) / GRID))
      endCol = Math.min(cols - 1, Math.ceil((mx + HOVER_R) / GRID))
    }

    const hoverStartCol = Math.max(startCol, Math.floor((mx - HOVER_R) / GRID))
    const hoverEndCol = Math.min(endCol, Math.ceil((mx + HOVER_R) / GRID))

    // 1. Draw non-hovered dots in this row using batched row-sprite chunks
    if (waveInf > 0) {
      const level = influenceToLevel(waveInf)
      const sy = level * GRID

      if (hoverStrength > 0 && hoverStartCol <= endCol && hoverEndCol >= startCol) {
        // Left chunk
        if (startCol < hoverStartCol) {
          const startX = startCol * GRID
          const width = (hoverStartCol - startCol) * GRID
          ctx.drawImage(rowSpriteCanvas, startX, sy, width, GRID, startX - 1.5 * GRID, rowY - GRID / 2, width, GRID)
        }
        // Right chunk
        if (endCol > hoverEndCol) {
          const startX = (hoverEndCol + 1) * GRID
          const width = (endCol - hoverEndCol) * GRID
          ctx.drawImage(rowSpriteCanvas, startX, sy, width, GRID, startX - 1.5 * GRID, rowY - GRID / 2, width, GRID)
        }
      } else {
        // Full chunk
        const startX = startCol * GRID
        const width = (endCol - startCol + 1) * GRID
        ctx.drawImage(rowSpriteCanvas, startX, sy, width, GRID, startX - 1.5 * GRID, rowY - GRID / 2, width, GRID)
      }
    }

    // 2. Draw hovered dots in this row individually
    if (hoverStrength > 0) {
      const validHoverStart = Math.max(startCol, hoverStartCol)
      const validHoverEnd = Math.min(endCol, hoverEndCol)

      for (let col = validHoverStart; col <= validHoverEnd; col++) {
        const cx = (col - 1) * GRID
        const dx = cx - mx
        const dy = rowY - my
        const d2 = dx * dx + dy * dy

        let hoverInf = 0
        if (d2 < HOVER_R2) {
          const dist = Math.sqrt(d2)
          hoverInf = Math.pow(1 - dist / HOVER_R, 2) * hoverStrength
        }

        const totalInf = Math.max(hoverInf, waveInf)

        if (totalInf > 0) {
          const sx = influenceToLevel(totalInf) * GRID
          ctx.drawImage(spriteCanvas, sx, 0, GRID, GRID, cx - GRID / 2, rowY - GRID / 2, GRID, GRID)
        }
      }
    }
  }
}

// ─── Radial wave + line band (Projects) ──────────────────────────────────────
// Precompute each dot's normalized distance-from-edge for the radial wave.
radialLineStrategy.onBuild = (extra, W, H, cols, rows, offsetY) => {
  const waveDists = new Float32Array(cols * rows)
  const maxDistFromEdge = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2)
  const centerX = W / 2
  const centerY = H / 2

  let i = 0
  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const cx = (col - 1) * GRID
      const cy = (row - 1) * GRID - offsetY
      const dCenter = Math.sqrt((cx - centerX) ** 2 + (cy - centerY) ** 2)
      waveDists[i++] = Math.max(0, (maxDistFromEdge - dCenter) / maxDistFromEdge)
    }
  }
  extra.waveDists = waveDists
}

export function radialLineStrategy(f) {
  const { ctx, cols, rows, globalOffsetY, spriteCanvas, rowSpriteCanvas, extra, hover, values } = f
  const waveFront = values.waveFront ?? 0
  const waveHeight = values.waveHeight ?? 0.25
  const lineWaveFront = values.lineWaveFront ?? 0
  const lineWaveHeight = values.lineWaveHeight ?? 0.15
  const { mx, my, strength: hoverStrength } = hover
  const { waveDists } = extra

  // Early exit: wave has fully saturated the screen — draw all rows at max level
  if (waveFront >= 1.0 + waveHeight && hoverStrength <= 0 && lineWaveFront <= -1) {
    const sy = (LEVELS - 1) * GRID
    const fullWidth = cols * GRID
    for (let row = 0; row < rows; row++) {
      const rowY = (row - 1) * GRID - globalOffsetY
      ctx.drawImage(rowSpriteCanvas, 0, sy, fullWidth, GRID, -GRID - GRID / 2, rowY - GRID / 2, fullWidth, GRID)
    }
    return
  }

  let i = 0
  for (let row = 0; row < rows; row++) {
    const rowY = (row - 1) * GRID - globalOffsetY

    for (let col = 0; col < cols; col++) {
      const cx = (col - 1) * GRID
      const dx = cx - mx
      const dy = rowY - my

      let hoverInf = 0
      if (hoverStrength > 0) {
        const d2 = dx * dx + dy * dy
        if (d2 < HOVER_R2) {
          const dist = Math.sqrt(d2)
          hoverInf = Math.pow(1 - dist / HOVER_R, 2) * hoverStrength
        }
      }

      let waveInf = 0
      if (waveFront > 0) {
        const depth = waveFront - waveDists[i]
        waveInf = depth > 0 ? Math.min(1, depth / waveHeight) : 0
      }
      i++

      let lineInf = 0
      if (lineWaveFront > -lineWaveHeight && lineWaveFront < 1.0 + lineWaveHeight) {
        const depth = Math.abs(lineWaveFront - row / rows)
        if (depth < lineWaveHeight) {
          // smooth ease out from the center of the line wave
          lineInf = Math.pow(1 - (depth / lineWaveHeight), 2)
        }
      }

      const totalInf = Math.max(hoverInf, waveInf, lineInf)

      if (totalInf > 0) {
        const sx = influenceToLevel(totalInf) * GRID
        ctx.drawImage(spriteCanvas, sx, 0, GRID, GRID, cx - GRID / 2, rowY - GRID / 2, GRID, GRID)
      }
    }
  }
}

// ─── Pulse ring + progress line (Gallery / Contact) ──────────────────────────
// Progress line — a horizontal band of boosted dots that sweeps down the
// grid as the section scrolls (drawn batched via row sprites)
const LINE_HALF = 48
const LINE_STRENGTH = 0.8
const PULSE_THICKNESS = 500 // px

export function pulseLineStrategy(f) {
  const { ctx, w, h, cols, rows, globalOffsetY, spriteCanvas, rowSpriteCanvas, hover, values } = f
  const pulseP = values.pulseProgress ?? 0
  const lineP = values.lineProgress ?? 0
  const { mx, my, strength: hoverStrength } = hover

  const maxDist = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2)
  // Pulse radius ranges from 0 to maxDist + thickness
  const pulseRadius = pulseP * (maxDist + PULSE_THICKNESS)
  const centerX = w / 2
  const centerY = h / 2
  const halfPulse = PULSE_THICKNESS / 2

  const lineActive = lineP > 0 && lineP < 1
  const lineY = lineP * h

  // Compute row range that intersects the pulse ring, hover area or line
  let startRow = rows
  let endRow = -1

  if (hoverStrength > 0) {
    startRow = Math.min(startRow, Math.max(0, Math.floor((my - HOVER_R) / GRID)))
    endRow = Math.max(endRow, Math.min(rows - 1, Math.ceil((my + HOVER_R) / GRID)))
  }

  if (lineActive) {
    startRow = Math.min(startRow, Math.max(0, Math.floor((lineY - LINE_HALF) / GRID)))
    endRow = Math.max(endRow, Math.min(rows - 1, Math.ceil((lineY + LINE_HALF) / GRID) + 1))
  }

  if (pulseP > 0 && pulseP < 1) {
    // Any row whose Y falls within the ring's outer radius could be affected
    const outerR = pulseRadius + halfPulse
    startRow = Math.min(startRow, Math.max(0, Math.floor((centerY - outerR) / GRID)))
    endRow = Math.max(endRow, Math.min(rows - 1, Math.ceil((centerY + outerR) / GRID)))
  }

  if (startRow > endRow) return

  for (let row = startRow; row <= endRow; row++) {
    const rowY = (row - 1) * GRID - globalOffsetY
    const dyCenter = rowY - centerY

    // Progress line influence — uniform across the row (horizontal band).
    // Intensity ramps in over the first stretch of travel so the line
    // fades into existence as scrolling starts instead of popping in.
    let lineInf = 0
    if (lineActive) {
      const dyLine = Math.abs(rowY - lineY)
      if (dyLine < LINE_HALF) {
        const ramp = Math.min(1, Math.max(0, (lineP - 0.02) / 0.08))
        lineInf = Math.pow(1 - dyLine / LINE_HALF, 1.5) * LINE_STRENGTH * ramp
      }
    }
    const lineLvl = influenceToLevel(lineInf)

    const hoverNearRow = hoverStrength > 0 && my >= rowY - HOVER_R && my <= rowY + HOVER_R

    // Batch the whole row when nothing varies across it (no hover nearby
    // and the pulse — if any — hits the row's extremes at the same level)
    if (!hoverNearRow) {
      let pulseUniform = true
      let pulseLvl = 0
      if (pulseP > 0 && pulseP < 1) {
        const minDxC = (centerX >= 0 && centerX <= (cols - 1) * GRID) ? 0 : Math.min(Math.abs(0 - centerX), Math.abs((cols - 1) * GRID - centerX))
        const maxDxC = Math.max(Math.abs(0 - centerX), Math.abs((cols - 1) * GRID - centerX))

        const minDist = Math.sqrt(minDxC * minDxC + dyCenter * dyCenter)
        const maxDist2 = Math.sqrt(maxDxC * maxDxC + dyCenter * dyCenter)

        const minDiff = Math.abs(minDist - pulseRadius)
        const maxDiff = Math.abs(maxDist2 - pulseRadius)

        const inf1 = minDiff < halfPulse ? Math.pow(1 - minDiff / halfPulse, 1.5) : 0
        const inf2 = maxDiff < halfPulse ? Math.pow(1 - maxDiff / halfPulse, 1.5) : 0
        const lvl1 = influenceToLevel(inf1)
        const lvl2 = influenceToLevel(inf2)

        pulseUniform = lvl1 === lvl2
        pulseLvl = lvl1
      }

      if (pulseUniform) {
        const lvl = Math.max(pulseLvl, lineLvl)
        if (lvl > 0) {
          const sy = lvl * GRID
          const fullWidth = cols * GRID
          ctx.drawImage(rowSpriteCanvas, 0, sy, fullWidth, GRID, -GRID - GRID / 2, rowY - GRID / 2, fullWidth, GRID)
        }
        continue // row fully handled — skip per-dot loop
      }
    }

    // Per-dot loop (only for rows that can't be batched)
    for (let col = 0; col < cols; col++) {
      const cx = (col - 1) * GRID
      const dx = cx - mx
      const dy = rowY - my
      const d2Hover = dx * dx + dy * dy

      let hoverInf = 0
      if (hoverStrength > 0 && d2Hover < HOVER_R2) {
        const dist = Math.sqrt(d2Hover)
        hoverInf = Math.pow(1 - dist / HOVER_R, 2) * hoverStrength
      }

      let pulseInf = 0
      if (pulseP > 0 && pulseP < 1) {
        const dxC = cx - centerX
        const dCenter = Math.sqrt(dxC * dxC + dyCenter * dyCenter)

        // Distance from the pulse ring
        const diff = Math.abs(dCenter - pulseRadius)
        if (diff < halfPulse) {
          // easing for smooth dropoff
          pulseInf = Math.pow(1 - diff / halfPulse, 1.5)
        }
      }

      const totalInf = Math.max(hoverInf, pulseInf, lineInf)

      if (totalInf > 0) {
        const sx = influenceToLevel(totalInf) * GRID
        ctx.drawImage(spriteCanvas, sx, 0, GRID, GRID, cx - GRID / 2, rowY - GRID / 2, GRID, GRID)
      }
    }
  }
}
