/**
 * HalftoneBg.jsx — Hero Section Halftone Dot Background
 *
 * Renders a full-viewport canvas of halftone dots that increase in size
 * from top to bottom, creating a gradient density effect that dissolves
 * into the cobalt-blue boundary. Dots are tinted to the current cobalt
 * color (which changes dynamically on hover via CSS custom properties).
 *
 * Performance optimisations:
 *   • Pre-renders a static offscreen canvas for the base dots
 *   • Only redraws the hover-affected region (not the full canvas)
 *   • Uses `source-in` compositing to tint all dots in a single fillRect
 */
import { useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID        = 18          // px between dot centres
const DOT_R_MIN   = 0.6         // radius at very top (px)
const DOT_R_MAX   = 8.5         // radius at very bottom — cells are 9px half, so nearly solid

export default function HalftoneBg({ containerId, colorRgbValue }) {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const rafRef    = useRef(null)

  // Pre-baked cell data — rebuilt only on resize
  const cellsRef = useRef(null)

  const DOT_OPACITY_TOP = 0.06
  const DOT_OPACITY_BOT = 1
  const HOVER_R         = 180
  const HOVER_R2        = HOVER_R * HOVER_R
  const HOVER_BOOST     = 6

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
      const count = cols * rows
      const data  = new Float32Array(count * 4)
      
      const offCanvas = document.createElement('canvas')
      offCanvas.width = W
      offCanvas.height = H
      const offCtx = offCanvas.getContext('2d')
      
      let i = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = (col - 1) * GRID
          const cy = (row - 1) * GRID - globalOffsetY
          const t      = H > 0 ? Math.max(0, Math.pow(cy / H, 2.2)) : 0
          const baseR  = DOT_R_MIN + t * (DOT_R_MAX - DOT_R_MIN)
          const opac   = DOT_OPACITY_TOP + t * (DOT_OPACITY_BOT - DOT_OPACITY_TOP)
          data[i++] = cx
          data[i++] = cy
          data[i++] = baseR
          data[i++] = opac
          
          const oi = Math.max(0, Math.min(1, opac))
          offCtx.beginPath()
          offCtx.arc(cx, cy, baseR, 0, Math.PI * 2)
          offCtx.fillStyle = `rgba(255, 255, 255, ${oi.toFixed(3)})`
          offCtx.fill()
        }
      }
      cellsRef.current = { data, count, cols, rows, offCanvas }
      needsRedraw = true
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = canvas.width  = rect.width
      h = canvas.height = rect.height
      if (w > 0 && h > 0) buildCells(w, h)
    }

    const HALF_CELL = GRID / 2 - 0.5
    const TAU = Math.PI * 2

    let hoverStrength = 0
    let lastMoveTime = 0

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const bag = cellsRef.current
      if (!bag || w === 0 || h === 0) return

      const { x: mx, y: my } = mouseRef.current
      const hasMouse = mx > -9000
      const { data, cols, rows, offCanvas } = bag

      const rgbStr = colorRgbValue ? colorRgbValue.get() : '27,58,140'
      const now = performance.now()
      if (now - lastMoveTime > 60) {
        hoverStrength = Math.max(0, hoverStrength - 0.03)
      } else {
        hoverStrength = Math.min(1, hoverStrength + 0.15)
      }

      if (!hasMouse && hoverStrength <= 0) {
        if (needsRedraw) {
           ctx.clearRect(0, 0, w, h)
           ctx.drawImage(offCanvas, 0, 0)
           // Tint the idle frame too — the pre-render is white, and
           // skipping this left a milky "glass" veil over the dots
           // until the first mousemove/tap swapped in tinted draws.
           ctx.globalCompositeOperation = 'source-in'
           ctx.fillStyle = `rgb(${rgbStr})`
           ctx.fillRect(0, 0, w, h)
           ctx.globalCompositeOperation = 'source-over'
           needsRedraw = false
        }
        return
      }

      needsRedraw = true
      ctx.clearRect(0, 0, w, h)
      
      // Draw white base dots
      ctx.drawImage(offCanvas, 0, 0)
      
      // Tint base dots to current color
      ctx.globalCompositeOperation = 'source-in'
      ctx.fillStyle = `rgb(${rgbStr})`
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'source-over'

      const minCol = Math.max(0, Math.floor((mx - HOVER_R) / GRID))
      const maxCol = Math.min(cols - 1, Math.ceil((mx + HOVER_R) / GRID))
      const minRow = Math.max(0, Math.floor((my - HOVER_R) / GRID))
      const maxRow = Math.min(rows - 1, Math.ceil((my + HOVER_R) / GRID))

      for (let row = minRow; row <= maxRow; row++) {
         for (let col = minCol; col <= maxCol; col++) {
            const idx = (row * cols + col) * 4
            const cx = data[idx]
            const cy = data[idx+1]
            const dx = cx - mx
            const dy = cy - my
            const d2 = dx * dx + dy * dy
            
            if (d2 < HOVER_R2) {
               let radius = data[idx+2]
               let baseOpac = data[idx+3]
               const dist = Math.sqrt(d2)
               const influence = Math.pow(1 - dist / HOVER_R, 2) * hoverStrength
               radius = Math.min(radius + HOVER_BOOST * influence, HALF_CELL)
               let oi = Math.round(Math.min(0.99, baseOpac + influence * 0.4) * 100)
               
               // Clear the base dot so alpha doesn't stack
               ctx.clearRect(cx - radius - 1, cy - radius - 1, radius * 2 + 2, radius * 2 + 2)
               
               ctx.beginPath()
               ctx.arc(cx, cy, radius, 0, TAU)
               ctx.fillStyle = `rgba(${rgbStr}, ${Math.min(1, baseOpac + influence * 0.4).toFixed(3)})`
               ctx.fill()
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

    // The idle frame is drawn once and cached — invalidate it whenever
    // the dynamic cobalt changes (nav hover/tap colour animations) so
    // the resting dots re-tint to match.
    const unsubColor = colorRgbValue?.on?.('change', () => { needsRedraw = true })

    const parent = canvas.parentElement
    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    resize()
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('mouseleave', handleLeave)
      unsubColor?.()
      ro.disconnect()
    }
  }, [containerId, colorRgbValue])

  return (
    <>
      {/* Halftone dot canvas */}
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          pointerEvents: 'none',
        }}
      />
      {/* Cobalt fade — dense dots dissolve into the site's primary blue */}
      <div
        style={{
          position: 'absolute',
          bottom: 0, left: 0, right: 0,
          height: '22%',
          background: `linear-gradient(to bottom, transparent, var(--color-cobalt) 90%)`,
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
