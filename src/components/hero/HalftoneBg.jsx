import { useEffect, useRef } from 'react'

// ── Constants ─────────────────────────────────────────────────────────────────
const GRID        = 18          // px between dot centres
const DOT_R_MIN   = 0.6         // radius at very top (px)
const DOT_R_MAX   = 8.5         // radius at very bottom — cells are 9px half, so nearly solid
const DOT_COLOR   = '27,58,140' // cobalt RGB
const DOT_OPACITY_TOP = 0.06    // opacity at the very top
const DOT_OPACITY_BOT = 1   // opacity at the very bottom
const HOVER_R         = 180     // cursor influence radius (px)
const HOVER_R2        = HOVER_R * HOVER_R
const HOVER_BOOST     = 6       // extra radius at cursor centre (px)

// Pre-cache every fill-style string — zero allocations per frame
const FILL_CACHE = Array.from({ length: 101 }, (_, i) =>
  `rgba(${DOT_COLOR},${(i / 100).toFixed(2)})`
)

export default function HalftoneBg() {
  const canvasRef = useRef(null)
  const mouseRef  = useRef({ x: -9999, y: -9999 })
  const rafRef    = useRef(null)

  // Pre-baked cell data — rebuilt only on resize
  const cellsRef = useRef(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx    = canvas.getContext('2d')
    let w = 0, h = 0

    function buildCells(W, H) {
      const cols  = Math.ceil(W / GRID) + 1
      const rows  = Math.ceil(H / GRID) + 1
      const count = cols * rows
      // 4 floats per cell: cx, cy, baseRadius, opacity
      const data  = new Float32Array(count * 4)
      let i = 0
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const cx = col * GRID
          const cy = row * GRID
          // Power curve: slow growth at top, fast near bottom
          const t      = H > 0 ? Math.pow(cy / H, 2.2) : 0
          const baseR  = DOT_R_MIN + t * (DOT_R_MAX - DOT_R_MIN)
          const opac   = DOT_OPACITY_TOP + t * (DOT_OPACITY_BOT - DOT_OPACITY_TOP)
          data[i++] = cx
          data[i++] = cy
          data[i++] = baseR
          data[i++] = opac
        }
      }
      cellsRef.current = { data, count }
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = canvas.width  = rect.width
      h = canvas.height = rect.height
      buildCells(w, h)
    }

    const HALF_CELL = GRID / 2 - 0.5
    const TAU = Math.PI * 2

    function draw() {
      rafRef.current = requestAnimationFrame(draw)
      const bag = cellsRef.current
      if (!bag || w === 0) return

      ctx.clearRect(0, 0, w, h)

      const { x: mx, y: my } = mouseRef.current
      const hasMouse = mx > -9000
      const { data, count } = bag

      for (let i = 0; i < count * 4; i += 4) {
        const cx      = data[i]
        const cy      = data[i + 1]
        let radius    = data[i + 2]
        let baseOpac  = data[i + 3]
        let oi        = Math.round(Math.min(0.99, baseOpac) * 100)

        if (hasMouse) {
          const dx = cx - mx
          const dy = cy - my
          const d2 = dx * dx + dy * dy
          if (d2 < HOVER_R2) {
            const dist      = Math.sqrt(d2)
            const influence = Math.pow(1 - dist / HOVER_R, 2)
            radius = Math.min(radius + HOVER_BOOST * influence, HALF_CELL)
            oi = Math.round(Math.min(0.99, baseOpac + influence * 0.4) * 100)
          }
        }

        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, TAU)
        ctx.fillStyle = FILL_CACHE[oi]
        ctx.fill()
      }
    }

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    }
    const handleLeave = () => { mouseRef.current = { x: -9999, y: -9999 } }

    const parent = canvas.parentElement
    parent.addEventListener('mousemove', handleMouse)
    parent.addEventListener('mouseleave', handleLeave)

    const ro = new ResizeObserver(resize)
    ro.observe(parent)
    resize()
    rafRef.current = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(rafRef.current)
      parent.removeEventListener('mousemove', handleMouse)
      parent.removeEventListener('mouseleave', handleLeave)
      ro.disconnect()
    }
  }, [])

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
          background: 'linear-gradient(to bottom, transparent, #1B3A8C 90%)',
          pointerEvents: 'none',
        }}
      />
    </>
  )
}
