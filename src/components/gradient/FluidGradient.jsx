/**
 * FluidGradient.jsx — Site-wide fluid mesh-gradient background.
 *
 * One fixed full-viewport WebGL canvas behind all content. Each frame it:
 *   • picks the section holding the viewport center and crossfades that
 *     palette toward the next near the bottom of the section (SEAM_FADE),
 *   • reads registered transition signals (seam/flood/pulse) — Task 8–11,
 *   • reads cursor strength (Task 6),
 *   • uploads uniforms and draws.
 * Throttled to ~30fps; pauses when no section is on screen. Reduced-motion
 * renders a single frame (Task 7). Falls back to the CSS body cream when
 * WebGL is unavailable.
 */
import { useEffect, useRef } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { SECTIONS } from '../../config/sections'
import { createGradientRenderer } from './glRenderer'
import { SECTION_PALETTES, COBALT, CREAM, GRADIENT } from './gradientConfig'
import { useGradientSignals } from '../../context/GradientContext'

export default function FluidGradient() {
  const canvasRef = useRef(null)
  const ctx = useGradientSignals()
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = createGradientRenderer(canvas)
    if (!renderer.supported) return // CSS body cream remains visible

    const signalsRef = ctx?.signalsRef ?? { current: {} }

    let w = 0, h = 0
    let rafId = null
    let lastDraw = 0
    const start = performance.now()

    const mouse = { x: -9999, y: -9999 }
    let mouseStrength = 0
    let lastMove = 0

    const onMove = (e) => {
      // GL origin is bottom-left; flip y so uMouse matches gl_FragCoord
      mouse.x = e.clientX
      mouse.y = h - e.clientY
      lastMove = performance.now()
    }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; mouseStrength = 0 }

    function resize() {
      const base = Math.min(window.devicePixelRatio || 1, 2)
      const dpr = isMobile ? base * GRADIENT.MOBILE_SCALE : base
      w = window.innerWidth
      h = window.innerHeight
      renderer.resize(w, h, dpr)
    }

    // Which section palette to show + crossfade toward the next.
    function paletteUniforms() {
      const center = h / 2
      let idx = 0
      let through = 0
      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= center && center < r.bottom) {
          idx = i
          through = r.height > 0 ? (center - r.top) / r.height : 0
          break
        }
        if (center >= r.bottom) idx = i // fallback: last passed section
      }
      const cur = SECTION_PALETTES[SECTIONS[idx].id].stops
      const nextIdx = Math.min(idx + 1, SECTIONS.length - 1)
      const nxt = SECTION_PALETTES[SECTIONS[nextIdx].id].stops
      const mix =
        through > GRADIENT.SEAM_FADE
          ? (through - GRADIENT.SEAM_FADE) / (1 - GRADIENT.SEAM_FADE)
          : 0
      return {
        uPalA0: cur[0], uPalA1: cur[1], uPalA2: cur[2],
        uPalB0: nxt[0], uPalB1: nxt[1], uPalB2: nxt[2],
        uPalMix: mix,
      }
    }

    function sig(key) {
      const mv = signalsRef.current[key]
      return mv ? mv.get() : 0
    }

    function draw(now) {
      rafId = requestAnimationFrame(draw)
      if (now - lastDraw < GRADIENT.FRAME_MS) return
      lastDraw = now

      if (isMobile) mouseStrength = 0
      else if (now - lastMove > 60) mouseStrength = Math.max(0, mouseStrength - GRADIENT.CURSOR_DECAY)
      else mouseStrength = Math.min(1, mouseStrength + GRADIENT.CURSOR_BUILD)

      renderer.setUniforms({
        uResolution: [canvas.width, canvas.height],
        uTime: ((now - start) / 1000) * GRADIENT.FLOW_SPEED,
        uMouse: [mouse.x, mouse.y],
        uMouseStrength: mouseStrength,
        uCursorR: GRADIENT.CURSOR_RADIUS,
        uCobalt: COBALT,
        uCream: CREAM,
        uSeam: sig('seam'),
        uFlood: sig('flood'),
        uPulse: sig('pulse'),
        ...paletteUniforms(),
      })
      renderer.render()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    if (reduceMotion) {
      draw(performance.now())     // single static frame
      if (rafId) cancelAnimationFrame(rafId) // draw() scheduled one; stop the loop
      rafId = null
    } else {
      rafId = requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      } else if (!rafId && !reduceMotion) {
        rafId = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('visibilitychange', onVisibility)
      renderer.dispose()
    }
  }, [ctx, reduceMotion, isMobile])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: -1, pointerEvents: 'none',
      }}
    />
  )
}
