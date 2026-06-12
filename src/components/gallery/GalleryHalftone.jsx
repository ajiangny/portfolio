/**
 * GalleryHalftone.jsx — Cream Halftone Dot Canvas (Gallery / Contact Sections)
 *
 * Renders an animated halftone dot grid (cream dots on black) used as the
 * background for both Gallery and Contact sections. The dots share the same
 * grid alignment so the pattern is seamless when scrolling between sections.
 *
 * Features a radial "pulse ring" effect — an expanding circle of boosted dots
 * that sweeps outward from center, driven by the Gallery scroll-in progress.
 *
 * Also supports mouse hover proximity boost and an early-out optimisation
 * based on parent headerOpacity to skip rendering when the layer is invisible.
 *
 * Performance optimisations: same sprite-sheet approach as ProfileHalftone.
 */
import { useEffect, useRef } from 'react'

const GRID         = 18
const DOT_R_MIN    = 1.0
const DOT_COLOR    = '245,240,232' // Cream dots
const BASE_OPACITY = 0.05
const HOVER_R      = 160
const HOVER_R2     = HOVER_R * HOVER_R
const HOVER_BOOST  = 4.5
const HALF_CELL    = GRID / 2 - 0.5

const FILL_CACHE = Array.from({ length: 101 }, (_, i) =>
  `rgba(${DOT_COLOR},${(i / 100).toFixed(2)})`
)

// Scroll-progress line — a horizontal band of boosted dots that sweeps
// down the grid as the section scrolls (drawn batched via row sprites)
const LINE_HALF = 48
const LINE_STRENGTH = 0.8

export default function GalleryHalftone({ pulseProgress: pulseProgressProp, headerOpacity: headerOpacityProp, lineProgress: lineProgressProp, containerId }) {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const rafRef    = useRef(null)
  const isVisible = useRef(false)
  const cellsRef  = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let w = 0, h = 0
    let needsRedraw = true

    function buildCells(W, H) {
      let globalOffsetY = 0
      if (containerId) {
        const el = document.getElementById(containerId)
        if (el) {
          let current = el
          let top = 0
          while (current) {
            top += current.offsetTop
            current = current.offsetParent
          }
          globalOffsetY = top % GRID
        }
      }

      const cols  = Math.ceil(W / GRID) + 2
      const rows  = Math.ceil(H / GRID) + 2

      const offCanvas = document.createElement('canvas')
      offCanvas.width = W
      offCanvas.height = H
      const offCtx = offCanvas.getContext('2d')

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = (col - 1) * GRID
          const cy = (row - 1) * GRID - globalOffsetY

          const oi = Math.round(Math.min(0.99, BASE_OPACITY) * 100)
          offCtx.beginPath()
          offCtx.arc(cx, cy, DOT_R_MIN, 0, Math.PI * 2)
          offCtx.fillStyle = FILL_CACHE[oi]
          offCtx.fill()
        }
      }

      const LEVELS = 60
      const spriteCanvas = document.createElement('canvas')
      spriteCanvas.width = LEVELS * GRID
      spriteCanvas.height = GRID
      const sCtx = spriteCanvas.getContext('2d')

      // Row sprite — pre-rendered full rows at each intensity level
      const rowSpriteCanvas = document.createElement('canvas')
      rowSpriteCanvas.width = cols * GRID
      rowSpriteCanvas.height = LEVELS * GRID
      const rsCtx = rowSpriteCanvas.getContext('2d')

      for (let lvl = 0; lvl < LEVELS; lvl++) {
        const inf = lvl / (LEVELS - 1)
        const finalRadius = Math.min(DOT_R_MIN + HOVER_BOOST * inf, HALF_CELL)
        const oi = Math.round(Math.min(0.99, BASE_OPACITY + inf * 0.5) * 100)

        sCtx.beginPath()
        sCtx.arc(lvl * GRID + GRID / 2, GRID / 2, finalRadius, 0, Math.PI * 2)
        sCtx.fillStyle = FILL_CACHE[oi]
        sCtx.fill()

        // Build full row sprite at this level
        rsCtx.fillStyle = FILL_CACHE[oi]
        const sy = lvl * GRID
        for (let col = 0; col < cols; col++) {
          const cx = col * GRID
          rsCtx.beginPath()
          rsCtx.arc(cx + GRID / 2, sy + GRID / 2, finalRadius, 0, Math.PI * 2)
          rsCtx.fill()
        }
      }

      cellsRef.current = { cols, rows, offCanvas, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY }
      needsRedraw = true
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = canvas.width  = rect.width
      h = canvas.height = rect.height
      if (w > 0 && h > 0) buildCells(w, h)
    }

    let hoverStrength = 0
    let lastMoveTime = 0
    let lastPulse = -1
    let lastLine = -1
    let lastDrawTime = 0

    function draw() {
      if (!isVisible.current) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(draw)
      const bag = cellsRef.current
      if (!bag || w === 0 || h === 0) return

      // Skip entirely when the header is invisible (opacity ≈ 0)
      // This is critical because the canvas is position:fixed, so IntersectionObserver
      // always reports it as visible even when the parent is transparent.
      const headerO = headerOpacityProp ? headerOpacityProp.get() : 1
      if (headerO < 0.01) return

      // Throttle to ~30fps — halftone dots don't need 60fps
      const now = performance.now()
      if (now - lastDrawTime < 30) return
      lastDrawTime = now

      const pulseP = pulseProgressProp ? pulseProgressProp.get() : 0
      const lineP = lineProgressProp ? lineProgressProp.get() : 0
      const lineActive = lineP > 0 && lineP < 1

      const { x: mx, y: my } = mouseRef.current
      const hasMouse = mx > -9000
      const { cols, rows, offCanvas, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY } = bag

      if (now - lastMoveTime > 60) {
        hoverStrength = Math.max(0, hoverStrength - 0.03)
      } else {
        hoverStrength = Math.min(1, hoverStrength + 0.15)
      }

      // Nothing dynamic changed — the previous frame is still correct
      // (unless a resize flagged needsRedraw, in which case fall through
      // so the cleared canvas gets repainted).
      const nothingChanged = !hasMouse && hoverStrength <= 0 && pulseP === lastPulse && lineP === lastLine
      if (nothingChanged && !needsRedraw) return
      if (nothingChanged && pulseP === 0 && !lineActive) {
        ctx.clearRect(0, 0, w, h)
        ctx.drawImage(offCanvas, 0, 0)
        needsRedraw = false
        return
      }

      needsRedraw = true
      lastPulse = pulseP
      lastLine = lineP
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(offCanvas, 0, 0)

      drawDynamicDots(pulseP, lineP, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY)
    }

    function drawDynamicDots(pulseP, lineP, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY) {
      const maxDist = Math.sqrt((w / 2) ** 2 + (h / 2) ** 2)
      // Pulse thickness in pixels
      const pulseThickness = 500
      // Pulse radius ranges from 0 to maxDist + pulseThickness
      const pulseRadius = pulseP * (maxDist + pulseThickness)
      const centerX = w / 2
      const centerY = h / 2
      const halfPulse = pulseThickness / 2

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
        // The pulse ring spans from pulseRadius - halfPulse to pulseRadius + halfPulse
        // from center. Convert to row bounds.
        const outerR = pulseRadius + halfPulse

        // Any row whose Y falls within [centerY - outerR, centerY + outerR] could be affected
        const topY = centerY - outerR
        const botY = centerY + outerR
        startRow = Math.min(startRow, Math.max(0, Math.floor(topY / GRID)))
        endRow = Math.max(endRow, Math.min(rows - 1, Math.ceil(botY / GRID)))
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
        const lineLvl = Math.max(0, Math.min(LEVELS - 1, Math.round(lineInf * (LEVELS - 1))))

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
            const lvl1 = Math.max(0, Math.min(LEVELS - 1, Math.round(inf1 * (LEVELS - 1))))
            const lvl2 = Math.max(0, Math.min(LEVELS - 1, Math.round(inf2 * (LEVELS - 1))))

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
            const level = Math.max(0, Math.min(LEVELS - 1, Math.round(totalInf * (LEVELS - 1))))
            const sx = level * GRID
            ctx.drawImage(spriteCanvas, sx, 0, GRID, GRID, cx - GRID / 2, rowY - GRID / 2, GRID, GRID)
          }
        }
      }
    }

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      mouseRef.current = { x, y }
      lastMoveTime = performance.now()
    }
    const handleLeave = () => {
      mouseRef.current = { x: -9999, y: -9999 }
      hoverStrength = 0
    }

    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('mouseleave', handleLeave)

    const parent = canvas.parentElement
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    const io = new IntersectionObserver(([entry]) => {
      isVisible.current = entry.isIntersecting
      if (entry.isIntersecting && !rafRef.current) {
        lastPulse = -1 // Force redraw on enter
        rafRef.current = requestAnimationFrame(draw)
      }
    })
    io.observe(canvas)

    // Also restart the RAF loop when headerOpacity becomes > 0
    let unsubHeader
    if (headerOpacityProp) {
      unsubHeader = headerOpacityProp.on('change', (v) => {
        if (v > 0.01 && isVisible.current && !rafRef.current) {
          lastPulse = -1
          rafRef.current = requestAnimationFrame(draw)
        }
      })
    }

    resize()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('mouseleave', handleLeave)
      ro.disconnect()
      io.disconnect()
      if (unsubHeader) unsubHeader()
    }
  }, [pulseProgressProp, lineProgressProp])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    />
  )
}
