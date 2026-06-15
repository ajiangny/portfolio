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
import { createFluidSim } from './fluidSim'
import { SECTION_PALETTES, COBALT, CREAM, GRADIENT, SIM, FLOW_ANGLES } from './gradientConfig'
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

    // Fluid sim shares the renderer's GL context. Unsupported (no float render
    // targets) → supported=false and we fall back to the plain warp gradient.
    const simRes = isMobile ? SIM.RES_MOBILE : SIM.RES_DESKTOP
    const sim = createFluidSim(renderer.gl, simRes)
    const simActive = sim.supported && !reduceMotion

    // 1×1 black stand-in so the display's uVelocity sampler always has a
    // valid texture bound when the sim is unavailable (no null-bind warnings).
    let placeholderTex = null
    if (!sim.supported) {
      const gl = renderer.gl
      placeholderTex = gl.createTexture()
      gl.bindTexture(gl.TEXTURE_2D, placeholderTex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([0, 0, 0, 255]))
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST)
    }
    const velocityTex = () => (sim.supported ? sim.velocityTexture : placeholderTex)

    let w = 0, h = 0
    let rafId = null
    let lastDraw = 0
    const start = performance.now()

    const mouse = { x: -9999, y: -9999 }
    let mouseStrength = 0
    let lastMove = 0

    // pointer in uv (origin bottom-left) with per-frame delta, for the sim
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, down: false, lastMove: -9999, iters: SIM.JACOBI_DESKTOP }

    const onMove = (e) => {
      // GL origin is bottom-left; flip y so uMouse matches gl_FragCoord
      mouse.x = e.clientX
      mouse.y = h - e.clientY
      lastMove = performance.now()
      // feed the sim pointer (normalized, with delta)
      const nx = e.clientX / w
      const ny = (h - e.clientY) / h
      pointer.dx = pointer.x < 0 ? 0 : nx - pointer.x
      pointer.dy = pointer.y < 0 ? 0 : ny - pointer.y
      pointer.x = nx; pointer.y = ny
      pointer.down = true
      pointer.lastMove = lastMove
    }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; mouseStrength = 0; pointer.down = false }

    // Touch drives the same sim on mobile (drag = push + wake). Passive
    // listeners that never preventDefault — the ripple is purely the reacting
    // background; the touch still scrolls / navigates as normal.
    const onTouch = (e) => {
      const t = e.touches && e.touches[0]
      if (!t) return
      const nx = t.clientX / w
      const ny = (h - t.clientY) / h
      pointer.dx = pointer.x < 0 ? 0 : nx - pointer.x
      pointer.dy = pointer.y < 0 ? 0 : ny - pointer.y
      pointer.x = nx; pointer.y = ny
      pointer.down = true
      pointer.lastMove = performance.now()
    }
    const onTouchEnd = () => { pointer.down = false }

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
        __idx: idx,   // active section index, for the hover gate (not a uniform)
      }
    }

    function sig(key) {
      const mv = signalsRef.current[key]
      return mv ? mv.get() : 0
    }

    const REST_HOVER = {
      uHoverPal0: COBALT, uHoverPal1: COBALT, uHoverPal2: COBALT,
      uHoverMix: 0, uFlowDir: [0, 0],
    }

    // Hover preview: while Hero (section 0) holds the viewport centre and a nav
    // blob is hovered, crossfade toward that section's palette and lean the
    // flow in its direction. Gated by activeIdx + strength so it can't bleed.
    function hoverUniforms(activeIdx) {
      const hov = sig('heroHover')            // SECTIONS index, or -1
      const strength = sig('heroHoverStrength')
      if (activeIdx !== 0 || hov < 0 || strength <= 0.001) return REST_HOVER
      const section = SECTIONS[Math.round(hov)]
      const stops = SECTION_PALETTES[section.id].stops
      const ang = FLOW_ANGLES[section.id] ?? 0
      return {
        uHoverPal0: stops[0], uHoverPal1: stops[1], uHoverPal2: stops[2],
        uHoverMix: strength,
        uFlowDir: [Math.cos(ang) * strength * 1.5, Math.sin(ang) * strength * 1.5],
      }
    }

    function draw(now) {
      rafId = requestAnimationFrame(draw)
      if (now - lastDraw < GRADIENT.FRAME_MS) return
      lastDraw = now

      if (isMobile) mouseStrength = 0
      else if (now - lastMove > 60) mouseStrength = Math.max(0, mouseStrength - GRADIENT.CURSOR_DECAY)
      else mouseStrength = Math.min(1, mouseStrength + GRADIENT.CURSOR_BUILD)

      // Lift the pointer shortly after motion stops: no new force is injected,
      // but the sim keeps advecting + dissipating until the wake settles.
      const sinceMove = now - pointer.lastMove
      if (sinceMove > 90) { pointer.dx = 0; pointer.dy = 0; pointer.down = false }

      // Step while interacting or the wake is still settling. Desktop keeps
      // the sim sampled (frozen near-zero field displaces nothing once idle);
      // mobile fully idles between touches to protect battery + scroll.
      let simOn = 0
      if (simActive) {
        const settling = sinceMove < SIM.SETTLE_MS
        if (isMobile) {
          if (pointer.down || settling) {
            pointer.iters = SIM.JACOBI_MOBILE
            sim.step(pointer)
            simOn = 1
          }
        } else {
          if (settling) {
            pointer.iters = SIM.JACOBI_DESKTOP
            sim.step(pointer)
          }
          simOn = 1
        }
      }

      const pal = paletteUniforms()
      const hoverU = hoverUniforms(pal.__idx)

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
        uVelocity: { tex: velocityTex(), unit: 1 },
        uSimEnabled: simOn,
        uDispScale: SIM.DISP_SCALE,
        uWakeBoost: SIM.WAKE_BOOST,
        ...pal,
        ...hoverU,
      })
      renderer.render()
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })
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
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('visibilitychange', onVisibility)
      sim.dispose()
      if (placeholderTex) renderer.gl.deleteTexture(placeholderTex)
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
