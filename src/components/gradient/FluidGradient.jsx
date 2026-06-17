/**
 * FluidGradient.jsx — Site-wide Three.js ink-fluid background.
 *
 * One fixed full-viewport WebGL canvas (z-index -1) behind all content. Each
 * frame it picks the section palette by viewport centre (crossfading toward the
 * next), steps the fluid (ambient drift always; cursor/touch adds force), and
 * composites base→ink by dye density. Mobile runs a smaller grid at ~30fps;
 * reduced-motion renders a single static frame; the loop pauses when hidden.
 * If WebGL2 / float targets are unavailable, the canvas stays empty and the CSS
 * body cream shows through.
 */
import { useEffect, useRef } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { SECTIONS } from '../../config/sections'
import { FluidScene } from './three/FluidScene'
import { SECTION_PALETTES, GRADIENT, SIM } from './gradientConfig'
import { selectPalette } from './paletteSelect'
import { lerp3 } from './colors'
import { hoverSignal } from './hoverSignal'

const ORDER = SECTIONS.map((s) => s.id)

export default function FluidGradient() {
  const canvasRef = useRef(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const canvas = canvasRef.current
    const scene = new FluidScene(canvas)
    if (!scene.supported) { scene.dispose(); return } // CSS cream fallback
    scene.setSimRes(isMobile ? SIM.RES_MOBILE : SIM.RES)

    let w = 0
    let h = 0
    let rafId = null
    let lastDraw = 0
    const start = performance.now()
    const frameMs = isMobile ? GRADIENT.FRAME_MS_MOBILE : 0

    // Hero nav-blob hover preview: eased crossfade toward the hovered section's
    // palette while Hero holds the viewport centre. `hoverDestId` persists
    // through the fade-out so leaving a blob eases back to Hero, not snaps.
    let hoverStrength = 0
    let hoverDestId = null
    const HOVER_EASE = 0.08

    // pointer in uv (origin bottom-left) with per-frame delta
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, down: false, lastMove: -9999 }

    const feed = (clientX, clientY) => {
      const nx = clientX / w
      const ny = (h - clientY) / h
      pointer.dx = pointer.x < 0 ? 0 : nx - pointer.x
      pointer.dy = pointer.y < 0 ? 0 : ny - pointer.y
      pointer.x = nx
      pointer.y = ny
      pointer.down = true
      pointer.lastMove = performance.now()
    }
    const onMove = (e) => feed(e.clientX, e.clientY)
    const onLeave = () => { pointer.down = false }
    // Passive touch listeners that never preventDefault — the ripple reacts but
    // the touch still scrolls / navigates normally.
    const onTouch = (e) => {
      const t = e.touches && e.touches[0]
      if (t) feed(t.clientX, t.clientY)
    }
    const onTouchEnd = () => { pointer.down = false }

    function resize() {
      const base = Math.min(window.devicePixelRatio || 1, 2)
      const dpr = isMobile ? base * GRADIENT.MOBILE_SCALE : base
      w = window.innerWidth
      h = window.innerHeight
      scene.resize(w, h, dpr)
    }

    function paletteNow() {
      const centerY = h / 2
      const rects = ORDER.map((id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, height: r.height }
      })
      const pal = selectPalette(rects, centerY, ORDER, SECTION_PALETTES, GRADIENT.SEAM_FADE)

      // Hover preview only while Hero (section 0) holds the centre, so it can't
      // bleed into other sections. hoverSignal.section is the destination
      // SECTIONS index (1..4) or -1.
      const heroRect = rects[0]
      const heroActive = heroRect && heroRect.top <= centerY && centerY < heroRect.bottom
      const hovIdx = heroActive ? hoverSignal.section : -1
      const hovId = hovIdx > 0 ? ORDER[hovIdx] : null
      if (hovId) hoverDestId = hovId
      hoverStrength += ((hovId ? 1 : 0) - hoverStrength) * HOVER_EASE
      if (!hoverDestId || hoverStrength < 0.002) return pal

      const dest = SECTION_PALETTES[hoverDestId]
      return {
        base0: lerp3(pal.base0, dest.base[0], hoverStrength),
        base1: lerp3(pal.base1, dest.base[1], hoverStrength),
        ink: lerp3(pal.ink, dest.ink, hoverStrength),
      }
    }

    function draw(now) {
      rafId = requestAnimationFrame(draw)
      if (frameMs && now - lastDraw < frameMs) return
      lastDraw = now
      // Lift the pointer shortly after motion stops (no new force injected).
      if (now - pointer.lastMove > 90) { pointer.dx = 0; pointer.dy = 0; pointer.down = false }
      scene.update({
        pointer,
        ambient: true,
        time: (now - start) / 1000,
        iters: isMobile ? SIM.JACOBI_MOBILE : SIM.JACOBI,
        palette: paletteNow(),
      })
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    if (reduceMotion) {
      scene.renderStatic(paletteNow()) // single static frame
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
      scene.dispose()
    }
  }, [reduceMotion, isMobile])

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
