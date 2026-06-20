/**
 * About.jsx — About Section
 *
 * A 700vh scroll-driven section. The Hero hands off to a white gallery panel:
 *
 * Phase 1 — Gallery wall (progress 0→0.15):
 *   A white panel fills the viewport with a grid of artwork (GridMontage),
 *   the profile photo dead-centre.
 *
 * Phase 2 — Inward dissolve (progress 0.15→0.32):
 *   The outer images dissolve ring-by-ring toward the centre; the white panel
 *   fades to reveal the fluid gradient, leaving only the profile photo.
 *
 * Phase 3 — Portrait journey (progress 0.30→0.52):
 *   An overlay portrait takes over the centre cell, expands to a large centred
 *   portrait (hold), then glides to its resting spot (desktop right panel /
 *   mobile top-centre).
 *
 * Phase 4 — Text panel (progress 0.504→0.5725):
 *   Heading, bio, skills, and resume slide in from behind the portrait.
 *
 * Fade-out (progress 0.85→1.0):
 *   Content fades via a CSS mask gradient, revealing the gradient as it
 *   crossfades cobalt→cream into the Projects section.
 */
import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, useMotionValueEvent, useSpring } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import {
  GRID_IMAGES, GRID_COLS, GRID_PROFILE_INDEX,
  GRID_IMAGES_MOBILE, GRID_COLS_MOBILE, GRID_PROFILE_INDEX_MOBILE,
} from '../data/aboutData'
import GridMontage from './about/GridMontage'
import AboutTextPanel from './about/AboutTextPanel'

// Portrait aspect (h / w) — matches the profile cell's 2:3 ratio so the
// transform handoff starts from the cell with zero distortion. Used for every
// keyframe (start/centre/final) so a single uniform scale reproduces the path.
const RATIO = 1.5
const RADIUS = 16 // fixed corner radius; scales naturally with the transform

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const lerpRect = (a, b, t) => ({
  left: a.left + (b.left - a.left) * t,
  top: a.top + (b.top - a.top) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
})

// ─── Main component ───────────────────────────────────────────────────────────
export default function About() {
  const containerRef = useRef(null)
  const lenisRef = useLenisContext()
  const progress = useMotionValue(0)
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Ref on the grid's centre (profile) cell — used to read its exact rect so
  // the overlay portrait can take over seamlessly.
  const profileCellRef = useRef(null)
  const cellRectRef = useRef(null)

  // ── Overlay portrait motion values — the portrait keeps a FIXED layout box
  // (its resting size) and reaches every keyframe via transform (translate +
  // uniform scale) only. Animating transform/opacity instead of width/height/
  // left/top means the image is painted ONCE and GPU-composited every frame —
  // no per-frame relayout or image repaint over the live WebGL canvas.
  const aboutX = useMotionValue(0)
  const aboutY = useMotionValue(0)
  const aboutScale = useMotionValue(1)
  const aboutOpacity = useMotionValue(0)

  // Resting box of the portrait (viewport-derived; recomputed on resize). The
  // element is sized to this in CSS; transforms map it onto each keyframe rect.
  // A ref mirrors it for the per-frame scroll handler (no stale closure).
  const [finalBox, setFinalBox] = useState(null)
  const finalBoxRef = useRef(null)
  useEffect(() => {
    const compute = () => {
      const vw = window.innerWidth
      const vh = window.innerHeight
      const mobile = vw < 768
      const finalW = mobile ? vw * 0.68 : vw * 0.30
      const finalH = finalW * RATIO
      const box = mobile
        // 104px clears the global header pill on any phone
        ? { left: (vw - finalW) / 2, top: 104, w: finalW, h: finalH }
        : { left: vw * 0.63, top: (vh - finalH) / 2, w: finalW, h: finalH }
      finalBoxRef.current = box
      setFinalBox(box)
    }
    compute()
    window.addEventListener('resize', compute)
    return () => window.removeEventListener('resize', compute)
  }, [])

  // ── Mouse parallax for the settled portrait ───────────────────────────────
  const profileMouseX = useMotionValue(0)
  const profileMouseY = useMotionValue(0)
  const smoothProfileX = useSpring(profileMouseX, { stiffness: 150, damping: 20 })
  const smoothProfileY = useSpring(profileMouseY, { stiffness: 150, damping: 20 })

  const profileRotateX = useTransform(smoothProfileY, [-1, 1], [8, -8])
  const profileRotateY = useTransform(smoothProfileX, [-1, 1], [-8, 8])

  const handleProfileMouseMove = (e) => {
    if (progress.get() < 0.52) return;
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width * 2 - 1
    const y = (e.clientY - rect.top) / rect.height * 2 - 1
    profileMouseX.set(x)
    profileMouseY.set(y)
  }

  const handleProfileMouseLeave = () => {
    profileMouseX.set(0)
    profileMouseY.set(0)
  }

  // ── Lenis scroll listener ─────────────────────────────────────────────────
  useEffect(() => {
    let unlisten = () => { }
    const t = setTimeout(() => {
      const lenis = lenisRef?.current
      if (!lenis) return
      const calc = (scroll) => {
        const el = containerRef.current
        if (!el) return
        const vh = window.innerHeight
        // Scale progress 0→1 over the 600vh sticky scroll distance.
        const activeHeight = vh * 6
        const raw = (scroll - el.offsetTop) / activeHeight
        progress.set(Math.max(0, Math.min(1, raw)))
      }
      const onScroll = ({ scroll }) => calc(scroll)
      calc(lenis.scroll ?? window.scrollY)
      lenis.on('scroll', onScroll)
      unlisten = () => lenis.off('scroll', onScroll)
    }, 0)
    return () => { clearTimeout(t); unlisten() }
  }, [lenisRef, progress])

  // ── Panel + grid dissolve windows ─────────────────────────────────────────
  // The white panel + grid are fully present from progress 0 (and so already
  // visible peeking up from below as Hero exits — nothing fades IN). The panel
  // only fades OUT to reveal the fluid gradient once the dissolve has run.
  const panelOpacity = useTransform(progress, [0.30, 0.42], [1, 0])
  // Centre cell hides as the overlay portrait fades in (seamless — same image).
  const profileCellHide = useTransform(progress, [0.30, 0.315], [1, 0])

  // Gradient fade out from bottom to top, 0.85→1.0; 'none' below so the wrapper
  // isn't a CSS backdrop root mid-section.
  const maskImage = useTransform(progress, (p) => {
    if (p < 0.8) return 'none'
    const t = Math.min(1, Math.max(0, (p - 0.85) / 0.15))
    const stop1 = -100 + t * 200
    const stop2 = t * 200
    return `linear-gradient(to top, transparent ${stop1}%, black ${stop2}%)`
  })

  // ── Drive the overlay portrait from the centre cell's actual DOM rect ──────
  //  A (0.30→0.40): centre cell → large CENTRED portrait
  //  hold (0.40→0.45): rests centre-stage
  //  B (0.45→0.52): glides to its resting spot
  useMotionValueEvent(progress, 'change', (v) => {
    const vw = window.innerWidth
    const vh = window.innerHeight
    const mobile = vw < 768

    // Reset parallax until the portrait has settled at its resting spot.
    if (v < 0.52) {
      profileMouseX.set(0)
      profileMouseY.set(0)
    }

    // Keep the centre-cell rect fresh while the wall is settled; freeze it once
    // the handoff begins so the expansion starts from a stable point.
    if (v >= 0.27 && profileCellRef.current) {
      if (v < 0.30 || !cellRectRef.current) {
        cellRectRef.current = profileCellRef.current.getBoundingClientRect()
      }
    }

    if (v < 0.30) {
      aboutOpacity.set(0)
      return
    }

    const rect = cellRectRef.current
    if (!rect) return

    // Fade the overlay in across the handoff window (0.30→0.315).
    aboutOpacity.set(clamp01((v - 0.30) / 0.015))

    const final = finalBoxRef.current
    if (!final) return

    const start = { left: rect.left, top: rect.top, w: rect.width, h: rect.height }

    const centerW = mobile ? vw * 0.56 : vw * 0.34
    const centerH = centerW * RATIO
    const center = { left: (vw - centerW) / 2, top: (vh - centerH) / 2, w: centerW, h: centerH }

    let cur
    if (v < 0.40) cur = lerpRect(start, center, easeInOut(clamp01((v - 0.30) / 0.10)))
    else if (v < 0.45) cur = center
    else if (v < 0.52) cur = lerpRect(center, final, easeInOut(clamp01((v - 0.45) / 0.07)))
    else cur = final

    // Map the cur rect onto the fixed `final` box via translate + uniform scale
    // (transform-origin centre). Aspect is constant (RATIO), so one scale hits
    // both width and height exactly — no distortion, no relayout.
    aboutScale.set(cur.w / final.w)
    aboutX.set((cur.left + cur.w / 2) - (final.left + final.w / 2))
    aboutY.set((cur.top + cur.h / 2) - (final.top + final.h / 2))
  })

  const grid = isMobile
    ? { images: GRID_IMAGES_MOBILE, cols: GRID_COLS_MOBILE, profileIndex: GRID_PROFILE_INDEX_MOBILE }
    : { images: GRID_IMAGES, cols: GRID_COLS, profileIndex: GRID_PROFILE_INDEX }

  return (
    <motion.div
      id="about"
      ref={containerRef}
      className="relative"
      style={{ height: '700vh', backgroundColor: 'transparent' }}
    >

      <div className="sticky top-0 overflow-hidden" style={{ height: '100vh' }}>
        <motion.div style={{ WebkitMaskImage: maskImage, maskImage, width: '100%', height: '100%' }}>

          {/* ── White gallery panel ─────────────────────────────────────────── */}
          {/* Fills the viewport behind the grid, then fades to reveal the fluid */}
          {/* gradient once the images have dissolved inward.                    */}
          <motion.div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: '#ffffff',
              opacity: panelOpacity,
              zIndex: 0,
              pointerEvents: 'none',
            }}
          />

          {/* ── Gallery-wall grid ───────────────────────────────────────────── */}
          {/* Static montage; outer cells dissolve inward on scroll, profile     */}
          {/* (centre) survives and is handed off to the overlay portrait.       */}
          {/* paddingTop clears the navbar: SiteHeader sits at top:18, height:46
               → 64px bottom edge + 16px breathing = 80px. paddingBottom adds
               16px at the bottom. navClearancePx (80+16=96) mirrors this so
               GridMontage derives the exact width that keeps portrait cells
               inside the available 100vh − 96px space. */}
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ paddingTop: 80, paddingBottom: 16, zIndex: 1 }}
          >
            <GridMontage
              images={grid.images}
              cols={grid.cols}
              profileIndex={grid.profileIndex}
              progress={progress}
              profileCellRef={profileCellRef}
              profileHideOpacity={profileCellHide}
              fitVw={isMobile ? 88 : 88}
              navClearancePx={96}
            />
          </div>

          {/* ── About — overlay portrait ────────────────────────────────────── */}
          {/* Starts at the grid centre cell's exact rect, then expands to the   */}
          {/* centred portrait and glides to its resting spot.                   */}
          <motion.div
            style={{
              position: 'absolute',
              left: finalBox?.left ?? 0,
              top: finalBox?.top ?? 0,
              width: finalBox?.w ?? 0,
              height: finalBox?.h ?? 0,
              x: aboutX,
              y: aboutY,
              scale: aboutScale,
              opacity: aboutOpacity,
              borderRadius: RADIUS,
              zIndex: 3,
              rotateX: profileRotateX,
              rotateY: profileRotateY,
              transformPerspective: 1200,
              transformOrigin: 'center',
              backfaceVisibility: 'hidden',
              willChange: 'transform',
            }}
            onMouseMove={handleProfileMouseMove}
            onMouseLeave={handleProfileMouseLeave}
            className="group"
          >
            {/* Pulse Glow */}
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{ animation: 'pulse-glow 2s ease-out infinite', borderRadius: RADIUS }}
            />
            {/* Pulse Ring */}
            <motion.div
              className="absolute inset-0 border border-[#f5f0e8] pointer-events-none"
              style={{ animation: 'pulse-ring 2s ease-out infinite', backfaceVisibility: 'hidden', borderRadius: RADIUS }}
            />
            <motion.div style={{ borderRadius: RADIUS, overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
              <img
                src="/art/profile.webp"
                alt="Andrew Jiang"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ objectPosition: 'top center' }}
              />
            </motion.div>
          </motion.div>

          {/* ── About — text panel ──────────────────────────────────────────── */}
          <AboutTextPanel progress={progress} isMobile={isMobile} />
        </motion.div>

      </div>
    </motion.div>
  )
}
