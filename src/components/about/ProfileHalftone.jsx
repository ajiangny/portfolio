/**
 * ProfileHalftone.jsx — Cream Halftone Dot Canvas (About Section)
 *
 * Renders an animated halftone dot grid (cream dots on transparent)
 * used for the About section background and the profile photo overlay.
 * Dots react to mouse proximity (hover boost) and a scroll-driven
 * wave that sweeps from bottom to top.
 *
 * Performance optimisations:
 *   • Pre-rendered offscreen canvas for static base dots
 *   • Sprite sheet for all dot size/opacity levels (avoids arc() calls)
 *   • Row sprite canvas for batch drawImage of uniform rows
 *   • IntersectionObserver to pause RAF when off-screen
 *   • Throttled to ~30fps
 */
import { useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID        = 18          // px between dot centres
const DOT_R_MIN   = 1.0         // base radius
const DOT_COLOR   = '245,240,232' // cream RGB
const BASE_OPACITY = 0.05       // base opacity
const HOVER_R         = 160     // cursor influence radius (px)
const HOVER_R2        = HOVER_R * HOVER_R
const HOVER_BOOST     = 4.5     // extra radius at cursor centre (px)

const FILL_CACHE = Array.from({ length: 101 }, (_, i) =>
  `rgba(${DOT_COLOR},${(i / 100).toFixed(2)})`
)

export default function ProfileHalftone({ scrollProgress, scrollRange, waveHeight = 0.15, waveFront: waveFrontProp, containerId }) {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const rafRef    = useRef(null)
  const isVisible = useRef(false)

  const cellsRef = useRef(null)

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

      // Add buffer rows/cols to ensure edges are covered after offset shift
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
          data[i++] = cx
          data[i++] = cy
          data[i++] = DOT_R_MIN
          data[i++] = BASE_OPACITY
          
          const oi = Math.round(Math.min(0.99, BASE_OPACITY) * 100)
          offCtx.beginPath()
          offCtx.arc(cx, cy, DOT_R_MIN, 0, Math.PI * 2)
          offCtx.fillStyle = FILL_CACHE[oi]
          offCtx.fill()
        }
      }

      // Pre-render a sprite sheet for all dot sizes/opacities to eliminate expensive arc() calls during animation
      const LEVELS = 60
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
         const finalRadius = Math.min(DOT_R_MIN + HOVER_BOOST * inf, HALF_CELL)
         const oi = Math.round(Math.min(0.99, BASE_OPACITY + inf * 0.5) * 100)
         
         // Build single dot sprite
         sCtx.beginPath()
         sCtx.arc(lvl * GRID + GRID/2, GRID/2, finalRadius, 0, Math.PI * 2)
         sCtx.fillStyle = FILL_CACHE[oi]
         sCtx.fill()

         // Build full row sprite
         rsCtx.fillStyle = FILL_CACHE[oi]
         const sy = lvl * GRID
         for (let col = 0; col < cols; col++) {
             const cx = col * GRID
             rsCtx.beginPath()
             rsCtx.arc(cx + GRID/2, sy + GRID/2, finalRadius, 0, Math.PI * 2)
             rsCtx.fill()
         }
      }

      cellsRef.current = { data, cols, rows, count, offCanvas, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY }
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
    let lastWaveFront = -1
    let lastDrawTime = 0

    function draw() {
      if (!isVisible.current) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(draw)
      const bag = cellsRef.current
      if (!bag || w === 0 || h === 0) return

      // Throttle to ~30fps — halftone dots don't need 60fps
      const now = performance.now()
      if (now - lastDrawTime < 30) return
      lastDrawTime = now

      let waveFront = 0;
      if (waveFrontProp) {
         waveFront = waveFrontProp.get()
      } else if (scrollProgress && scrollRange) {
         const p = scrollProgress.get()
         const waveT = Math.max(0, Math.min(1, (p - scrollRange[0]) / (scrollRange[1] - scrollRange[0])))
         waveFront = waveT * waveHeight
      }

      const { x: mx, y: my } = mouseRef.current
      const hasMouse = mx > -9000
      const { cols, rows, offCanvas, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY } = bag

      if (now - lastMoveTime > 60) {
        hoverStrength = Math.max(0, hoverStrength - 0.03)
      } else {
        hoverStrength = Math.min(1, hoverStrength + 0.15)
      }

      if (!hasMouse && hoverStrength <= 0 && waveFront === lastWaveFront) {
        if (needsRedraw) {
           ctx.clearRect(0, 0, w, h)
           ctx.drawImage(offCanvas, 0, 0)
           if (waveFront > 0) drawDynamicDots(waveFront, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY)
           needsRedraw = false
        }
        return
      }

      needsRedraw = true
      lastWaveFront = waveFront
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(offCanvas, 0, 0)
      
      drawDynamicDots(waveFront, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY)
    }

    function drawDynamicDots(waveFront, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY) {
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

         // 1. Draw non-hovered dots in this row using drawImage chunks
         if (waveInf > 0) {
            const level = Math.max(0, Math.min(LEVELS - 1, Math.round(waveInf * (LEVELS - 1))))
            const sy = level * GRID
            
            if (hoverStrength > 0 && hoverStartCol <= endCol && hoverEndCol >= startCol) {
               // Draw left chunk
               if (startCol < hoverStartCol) {
                   const startX = startCol * GRID;
                   const width = (hoverStartCol - startCol) * GRID;
                   ctx.drawImage(rowSpriteCanvas, startX, sy, width, GRID, startX - 1.5 * GRID, rowY - GRID/2, width, GRID);
               }
               // Draw right chunk
               if (endCol > hoverEndCol) {
                   const startX = (hoverEndCol + 1) * GRID;
                   const width = (endCol - hoverEndCol) * GRID;
                   ctx.drawImage(rowSpriteCanvas, startX, sy, width, GRID, startX - 1.5 * GRID, rowY - GRID/2, width, GRID);
               }
            } else {
               // Draw full chunk
               const startX = startCol * GRID;
               const width = (endCol - startCol + 1) * GRID;
               ctx.drawImage(rowSpriteCanvas, startX, sy, width, GRID, startX - 1.5 * GRID, rowY - GRID/2, width, GRID);
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
                  const level = Math.max(0, Math.min(LEVELS - 1, Math.round(totalInf * (LEVELS - 1))))
                  const sx = level * GRID
                  ctx.drawImage(spriteCanvas, sx, 0, GRID, GRID, cx - GRID/2, rowY - GRID/2, GRID, GRID)
               }
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
        lastWaveFront = -1 // Force redraw on enter
        rafRef.current = requestAnimationFrame(draw)
      }
    })
    io.observe(canvas)
    
    resize()

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('mouseleave', handleLeave)
      ro.disconnect()
      io.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 10,
      }}
    />
  )
}
