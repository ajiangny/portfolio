import { useEffect, useRef } from 'react'

// ── Constants — same grid/size as About, but cobalt dots on cream bg ─────────
const GRID         = 18          // px between dot centres
const DOT_R_MIN    = 1.0         // base radius — same as About
const DOT_COLOR    = '27,58,140'  // cobalt RGB — visible on cream background
const BASE_OPACITY = 0.08        // slightly higher than About since cobalt is subtler on cream
const HOVER_R      = 160         // cursor influence radius (px)
const HOVER_R2     = HOVER_R * HOVER_R
const HOVER_BOOST  = 4.5         // extra radius at cursor centre (px)
const HALF_CELL    = GRID / 2 - 0.5

const FILL_CACHE = Array.from({ length: 101 }, (_, i) =>
  `rgba(${DOT_COLOR},${(i / 100).toFixed(2)})`
)

export default function ProjectsHalftone({ containerId, waveFront: waveFrontProp, waveHeight: waveHeightProp = 0.25 }) {
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

      // Add buffer rows/cols to ensure edges are covered after offset shift
      const cols  = Math.ceil(W / GRID) + 2
      const rows  = Math.ceil(H / GRID) + 2
      const count = cols * rows
      const data  = new Float32Array(count * 4)

      const offCanvas = document.createElement('canvas')
      offCanvas.width = W
      offCanvas.height = H
      const offCtx = offCanvas.getContext('2d')

      const waveDists = new Float32Array(count)
      const maxDistFromEdge = Math.sqrt((W / 2) ** 2 + (H / 2) ** 2);
      const centerX = W / 2;
      const centerY = H / 2;

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

      // Precompute normalized distances for the wave effect
      i = 0;
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = (col - 1) * GRID;
          const cy = (row - 1) * GRID - globalOffsetY;
          const dxC = cx - centerX;
          const dyC = cy - centerY;
          const dCenter = Math.sqrt(dxC * dxC + dyC * dyC);
          const distFromEdge = maxDistFromEdge - dCenter;
          waveDists[i++] = Math.max(0, distFromEdge / maxDistFromEdge);
        }
      }

      // Pre-render sprite sheets for all dot sizes/opacities
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

        sCtx.beginPath()
        sCtx.arc(lvl * GRID + GRID / 2, GRID / 2, finalRadius, 0, Math.PI * 2)
        sCtx.fillStyle = FILL_CACHE[oi]
        sCtx.fill()

        rsCtx.fillStyle = FILL_CACHE[oi]
        const sy = lvl * GRID
        for (let col = 0; col < cols; col++) {
          const cx = col * GRID
          rsCtx.beginPath()
          rsCtx.arc(cx + GRID / 2, sy + GRID / 2, finalRadius, 0, Math.PI * 2)
          rsCtx.fill()
        }
      }

      cellsRef.current = { data, count, cols, rows, offCanvas, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY, waveDists }
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
    let lastWaveFront = -1
    let lastWaveHeight = -1
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

      // Read current wave position and height from motion value props
      const waveFront = waveFrontProp ? waveFrontProp.get() : 0
      const waveHeight = typeof waveHeightProp === 'number' ? waveHeightProp : (waveHeightProp ? waveHeightProp.get() : 0.25)

      const { x: mx, y: my } = mouseRef.current
      const hasMouse = mx > -9000
      const { cols, rows, offCanvas, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY, waveDists } = bag

      if (now - lastMoveTime > 60) {
        hoverStrength = Math.max(0, hoverStrength - 0.03)
      } else {
        hoverStrength = Math.min(1, hoverStrength + 0.15)
      }

      // Skip redraw if nothing has changed
      if (!hasMouse && hoverStrength <= 0 && waveFront === lastWaveFront && waveHeight === lastWaveHeight) {
        if (needsRedraw) {
          if (waveFront === 0) {
            ctx.clearRect(0, 0, w, h)
            ctx.drawImage(offCanvas, 0, 0)
          }
          needsRedraw = false
        }
        return
      }

      needsRedraw = true
      lastWaveFront = waveFront
      lastWaveHeight = waveHeight
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(offCanvas, 0, 0)

      drawDynamicDots(waveFront, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY, waveHeight, waveDists)
    }

    function drawDynamicDots(waveFront, mx, my, hoverStrength, cols, rows, spriteCanvas, rowSpriteCanvas, LEVELS, globalOffsetY, waveHeight, waveDists) {
      // Early exit: if the wave has fully saturated the screen, draw all rows at max level
      if (waveFront >= 1.0 + waveHeight && hoverStrength <= 0) {
        const maxLevel = LEVELS - 1;
        const sy = maxLevel * GRID;
        const fullWidth = cols * GRID;
        for (let row = 0; row < rows; row++) {
          const rowY = (row - 1) * GRID - globalOffsetY;
          ctx.drawImage(rowSpriteCanvas, 0, sy, fullWidth, GRID, -GRID - GRID / 2, rowY - GRID / 2, fullWidth, GRID);
        }
        return;
      }

      let i = 0;
      for (let row = 0; row < rows; row++) {
        const rowY = (row - 1) * GRID - globalOffsetY;

        for (let col = 0; col < cols; col++) {
          const cx = (col - 1) * GRID;
          const dx = cx - mx;
          const dy = rowY - my;
          
          let hoverInf = 0;
          if (hoverStrength > 0) {
            const d2 = dx * dx + dy * dy;
            if (d2 < HOVER_R2) {
              const dist = Math.sqrt(d2);
              hoverInf = Math.pow(1 - dist / HOVER_R, 2) * hoverStrength;
            }
          }

          let waveInf = 0;
          if (waveFront > 0) {
            const normalizedDist = waveDists[i];
            const depth = waveFront - normalizedDist;
            waveInf = depth > 0 ? Math.min(1, depth / waveHeight) : 0;
          }
          i++;

          const totalInf = Math.max(hoverInf, waveInf);

          if (totalInf > 0) {
            const level = Math.max(0, Math.min(LEVELS - 1, Math.round(totalInf * (LEVELS - 1))));
            const sx = level * GRID;
            ctx.drawImage(spriteCanvas, sx, 0, GRID, GRID, cx - GRID / 2, rowY - GRID / 2, GRID, GRID);
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
        position: 'absolute',
        inset: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    />
  )
}
