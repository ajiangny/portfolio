import { useEffect, useRef } from 'react'

// ── Constants — same grid/size as About, but cobalt dots on cream bg ─────────
const GRID         = 18          // px between dot centres
const DOT_R_MIN    = 1.0         // base radius — same as About
const DOT_COLOR    = '27,58,140'  // cobalt RGB — visible on cream background
const BASE_OPACITY = 0.08        // slightly higher than About since cobalt is subtler on cream
const HOVER_R      = 160         // cursor influence radius (px)
const HOVER_R2     = HOVER_R * HOVER_R
const HOVER_BOOST  = 4.5         // extra radius at cursor centre (px)

const FILL_CACHE = Array.from({ length: 101 }, (_, i) =>
  `rgba(${DOT_COLOR},${(i / 100).toFixed(2)})`
)

export default function ProjectsHalftone({ containerId }) {
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

    const HALF_CELL = GRID / 2 - 0.5

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

      cellsRef.current = { data, count, cols, rows, offCanvas }
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

    function draw() {
      if (!isVisible.current) {
        rafRef.current = null
        return
      }
      rafRef.current = requestAnimationFrame(draw)
      const bag = cellsRef.current
      if (!bag || w === 0 || h === 0) return

      const { x: mx, y: my } = mouseRef.current
      const hasMouse = mx > -9000
      const { data, cols, rows, offCanvas } = bag

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
          needsRedraw = false
        }
        return
      }

      needsRedraw = true
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(offCanvas, 0, 0)

      // Only redraw dots near the cursor
      const minCol = Math.max(0, Math.floor((mx - HOVER_R) / GRID))
      const maxCol = Math.min(cols - 1, Math.ceil((mx + HOVER_R) / GRID))
      const minRow = Math.max(0, Math.floor((my - HOVER_R) / GRID))
      const maxRow = Math.min(rows - 1, Math.ceil((my + HOVER_R) / GRID))

      for (let row = minRow; row <= maxRow; row++) {
        for (let col = minCol; col <= maxCol; col++) {
          const idx = (row * cols + col) * 4
          const cx = data[idx]
          const cy = data[idx + 1]
          const dx = cx - mx
          const dy = cy - my
          const d2 = dx * dx + dy * dy

          if (d2 < HOVER_R2) {
            let radius = data[idx + 2]
            const dist = Math.sqrt(d2)
            const influence = Math.pow(1 - dist / HOVER_R, 2) * hoverStrength
            radius = Math.min(radius + HOVER_BOOST * influence, HALF_CELL)
            const oi = Math.round(Math.min(0.99, BASE_OPACITY + influence * 0.5) * 100)

            // Clear the base dot so alpha doesn't stack
            ctx.clearRect(cx - radius - 1, cy - radius - 1, radius * 2 + 2, radius * 2 + 2)

            ctx.beginPath()
            ctx.arc(cx, cy, radius, 0, Math.PI * 2)
            ctx.fillStyle = FILL_CACHE[oi]
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

    const parent = canvas.parentElement
    const ro = new ResizeObserver(resize)
    ro.observe(parent)

    const io = new IntersectionObserver(([entry]) => {
      isVisible.current = entry.isIntersecting
      if (entry.isIntersecting && !rafRef.current) {
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
