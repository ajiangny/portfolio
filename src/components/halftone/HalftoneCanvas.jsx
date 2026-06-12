/**
 * HalftoneCanvas.jsx — Unified Halftone Dot Canvas Engine
 *
 * One component owns everything the halftone canvases share:
 *   • Grid-aligned base layer + sprite sheets (halftoneCore.js)
 *   • Mouse-proximity hover boost with build-up/decay
 *   • ResizeObserver rebuild, IntersectionObserver RAF pause,
 *     ~30fps throttle, optional headerOpacity gate for fixed layers
 *   • Dirty-checking — skips repaints while no effect value changed
 *
 * What's actually drawn each frame is delegated to a `strategy`
 * function (halftoneStrategies.js) so each section keeps its own
 * effect. Section presets live in the thin wrappers:
 *   ProfileHalftone / ProjectsHalftone / GalleryHalftone.
 *
 * Props
 *   color        'r,g,b' dot colour
 *   baseOpacity  resting dot opacity
 *   baseRadius   resting dot radius (default 1)
 *   hoverBoost   extra radius at the cursor centre (default 4.5)
 *   strategy     draw function; optional strategy.onBuild precomputes
 *                per-resize data into frame.extra
 *   values       { name: MotionValue | number } effect inputs. Read
 *                through a ref every frame, so swapping a MotionValue
 *                identity (e.g. mobile/desktop variants) never goes
 *                stale.
 *   containerId  section id for global grid alignment
 *   headerOpacity optional MotionValue — skip drawing while ≈0 (needed
 *                for position:fixed layers, where IntersectionObserver
 *                always reports the canvas visible)
 *   style        extra canvas styles (zIndex etc.)
 */
import { useEffect, useRef } from 'react'
import {
  buildFillCache, computeGlobalOffsetY,
  buildUniformBase, buildSpriteSheets, HOVER_R, HOVER_R2,
} from './halftoneCore'

const FRAME_MS = 30 // ~30fps — halftone dots don't need 60

export default function HalftoneCanvas({
  color,
  baseOpacity,
  baseRadius = 1.0,
  hoverBoost = 4.5,
  strategy,
  values = {},
  containerId,
  headerOpacity,
  style,
}) {
  const canvasRef = useRef(null)

  // Latest props, readable from the long-lived draw loop. Updating refs
  // post-render keeps the effect below dependency-free (and immune to
  // prop-identity swaps, e.g. About's mobile/desktop wave MotionValues).
  const propsRef = useRef({ values, headerOpacity, strategy, containerId })
  useEffect(() => {
    propsRef.current = { values, headerOpacity, strategy, containerId }
  })

  // Static per-mount visual config (colour changes would need a remount —
  // none of the sections do this; they tint via CSS filter instead).
  const configRef = useRef({ color, baseOpacity, baseRadius, hoverBoost })

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const { color, baseOpacity, baseRadius, hoverBoost } = configRef.current
    const fillCache = buildFillCache(color)

    let w = 0, h = 0
    let bag = null            // { offCanvas, cols, rows, sprites, extra, offsetY }
    let needsRedraw = true
    let lastValues = {}
    let rafId = null
    let isVisible = false

    let hoverStrength = 0
    let lastMoveTime = 0
    let lastDrawTime = 0
    const mouse = { x: -9999, y: -9999 }

    function build(W, H) {
      const offsetY = computeGlobalOffsetY(propsRef.current.containerId)
      const { offCanvas, cols, rows } = buildUniformBase(W, H, {
        offsetY, radius: baseRadius, fillCache, baseOpacity,
      })
      const { spriteCanvas, rowSpriteCanvas } = buildSpriteSheets(cols, {
        fillCache, baseRadius, baseOpacity, hoverBoost,
      })

      const extra = {}
      propsRef.current.strategy?.onBuild?.(extra, W, H, cols, rows, offsetY)

      bag = { offCanvas, cols, rows, spriteCanvas, rowSpriteCanvas, extra, offsetY }
      needsRedraw = true
    }

    function resize() {
      const rect = canvas.parentElement.getBoundingClientRect()
      w = canvas.width = rect.width
      h = canvas.height = rect.height
      if (w > 0 && h > 0) build(w, h)
    }

    function readValues() {
      const out = {}
      const src = propsRef.current.values
      for (const k in src) {
        const v = src[k]
        out[k] = typeof v === 'number' ? v : (v?.get?.() ?? 0)
      }
      return out
    }

    function valuesChanged(next) {
      for (const k in next) if (next[k] !== lastValues[k]) return true
      return false
    }

    function draw() {
      if (!isVisible) {
        rafId = null
        return
      }
      rafId = requestAnimationFrame(draw)
      if (!bag || w === 0 || h === 0) return

      // Skip entirely while an opacity-gated fixed layer is invisible
      const headerMv = propsRef.current.headerOpacity
      if (headerMv && headerMv.get() < 0.01) return

      const now = performance.now()
      if (now - lastDrawTime < FRAME_MS) return
      lastDrawTime = now

      // Hover builds up while the mouse moves and decays when it rests
      if (now - lastMoveTime > 60) {
        hoverStrength = Math.max(0, hoverStrength - 0.03)
      } else {
        hoverStrength = Math.min(1, hoverStrength + 0.15)
      }

      const vals = readValues()
      const hasMouse = mouse.x > -9000
      const active = hasMouse || hoverStrength > 0 || valuesChanged(vals)

      if (!active && !needsRedraw) return

      needsRedraw = false
      lastValues = vals
      ctx.clearRect(0, 0, w, h)
      ctx.drawImage(bag.offCanvas, 0, 0)

      propsRef.current.strategy?.({
        ctx, w, h,
        cols: bag.cols,
        rows: bag.rows,
        globalOffsetY: bag.offsetY,
        spriteCanvas: bag.spriteCanvas,
        rowSpriteCanvas: bag.rowSpriteCanvas,
        extra: bag.extra,
        hover: { mx: mouse.x, my: mouse.y, strength: hoverStrength, R: HOVER_R, R2: HOVER_R2 },
        values: vals,
      })
    }

    const startLoop = () => {
      if (!rafId && isVisible) {
        needsRedraw = true
        rafId = requestAnimationFrame(draw)
      }
    }

    const handleMouse = (e) => {
      const rect = canvas.getBoundingClientRect()
      mouse.x = e.clientX - rect.left
      mouse.y = e.clientY - rect.top
      lastMoveTime = performance.now()
    }
    const handleLeave = () => {
      mouse.x = -9999
      mouse.y = -9999
      hoverStrength = 0
    }

    window.addEventListener('mousemove', handleMouse)
    window.addEventListener('mouseleave', handleLeave)

    const ro = new ResizeObserver(resize)
    ro.observe(canvas.parentElement)

    const io = new IntersectionObserver(([entry]) => {
      isVisible = entry.isIntersecting
      startLoop()
    })
    io.observe(canvas)

    // For opacity-gated fixed layers: wake the loop when they fade in
    const headerMv = propsRef.current.headerOpacity
    const unsubHeader = headerMv?.on?.('change', (v) => {
      if (v > 0.01) startLoop()
    })

    resize()

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('mousemove', handleMouse)
      window.removeEventListener('mouseleave', handleLeave)
      ro.disconnect()
      io.disconnect()
      unsubHeader?.()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute', inset: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        ...style,
      }}
    />
  )
}
