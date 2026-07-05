/**
 * About.jsx — About Section
 *
 * A 700vh scroll-driven section. The Hero hands off to a white gallery panel,
 * then the journey resolves into a bento grid (AboutBento):
 *
 * Phase 1 — Gallery wall (progress 0→0.15):
 *   A white panel fills the viewport with a grid of artwork (GridMontage),
 *   the profile photo dead-centre.
 *
 * Phase 2 — Inward dissolve (progress 0.15→0.32):
 *   The outer images dissolve ring-by-ring toward the centre; the white panel
 *   fades to reveal the fluid gradient, leaving only the profile photo.
 *
 * Phase 3 — Portrait journey (progress 0.30→0.48):
 *   An overlay portrait takes over the centre cell and moves DIRECTLY to the
 *   bento PROFILE TILE's measured rect (no centre expand/hold). On desktop the
 *   overlay simply settles there as the profile card. On mobile it crossfades
 *   into the in-grid photo so the photo pans with the bento.
 *
 * Phase 4 — Bento assembly (progress 0.50→0.66):
 *   The other six tiles self-assemble around the profile (AboutBento).
 *
 * Leave (progress 1.0):
 *   No exit effect. The settled bento holds, then the sticky releases and the whole
 *   stack scrolls up flush (Projects sits -2px beneath) — a continuous handoff
 *   into the Projects "Selected Works" opener as the gradient crossfades
 *   cobalt→cream.
 */
import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useMotionValueEvent } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import {
  GRID_IMAGES, GRID_COLS, GRID_PROFILE_INDEX,
  GRID_IMAGES_MOBILE, GRID_COLS_MOBILE, GRID_PROFILE_INDEX_MOBILE,
} from '../data/aboutData'
import GridMontage from './about/GridMontage'
import AboutBento from './about/AboutBento'

// Fixed corner radius for the flying profile card (matches the bento tiles).
const RADIUS = 22

const clamp01 = (v) => Math.max(0, Math.min(1, v))
const easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
const lerp = (a, b, t) => a + (b - a) * t
const lerpRect = (a, b, t) => ({
  left: a.left + (b.left - a.left) * t,
  top: a.top + (b.top - a.top) * t,
  w: a.w + (b.w - a.w) * t,
  h: a.h + (b.h - a.h) * t,
})

// Gallery centre-cell shell (GridMontage) → bento .ab-tile shell. The flying
// portrait MORPHS between these instead of crossfading, so the handoff reads as
// one continuous element. Size-based props (radius, shadow offset/blur) are
// counter-scaled by the live transform scale so the *rendered* value is exact
// at both ends of the flight.
const CELL_RADIUS = 10 // GridMontage centre cell (round(10 × scale 1))
const CELL_BORDER_A = 0.40
const TILE_BORDER_A = 0.18
const CELL_SHADOW = { y: 18, blur: 50, r: 16, g: 20, b: 38, a: 0.34 }
const TILE_SHADOW = { y: 8, blur: 30, r: 8, g: 12, b: 40, a: 0.18 }

// ─── Main component ───────────────────────────────────────────────────────────
export default function About() {
  const containerRef = useRef(null)
  const stickyRef = useRef(null)
  const lenisRef = useLenisContext()
  const progress = useMotionValue(0)
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Ref on the grid's centre (profile) cell — the journey START rect.
  const profileCellRef = useRef(null)
  const cellRectRef = useRef(null)
  // Ref on the bento profile tile — the journey END rect (measured below).
  const profileTileRef = useRef(null)

  // ── Overlay portrait motion values — the FLIGHT vehicle. It morphs its REAL
  // box (left/top/width/height), not a uniform transform scale, so the aspect
  // can travel tall-portrait → square: the object-cover image re-crops
  // continuously (face pinned via objectPosition) instead of snapping height at
  // the handoff. It takes over the gallery cell fully opaque (no crossfade) and,
  // on mobile only, fades out at landing as the in-grid bento photo fades in.
  const aboutLeft = useMotionValue(0)
  const aboutTop = useMotionValue(0)
  const aboutW = useMotionValue(0)
  const aboutH = useMotionValue(0)
  const aboutOpacity = useMotionValue(0)

  // Shell motion values — morph the flying card's radius/border/shadow from the
  // gallery-cell look to the bento-tile look across the flight (see CELL_*/TILE_*).
  const aboutRadius = useMotionValue(RADIUS)
  const aboutBorderColor = useMotionValue(`rgba(255,255,255,${TILE_BORDER_A})`)
  const aboutShadow = useMotionValue(
    `0 ${TILE_SHADOW.y}px ${TILE_SHADOW.blur}px rgba(${TILE_SHADOW.r},${TILE_SHADOW.g},${TILE_SHADOW.b},${TILE_SHADOW.a})`,
  )

  // Resting box of the portrait = the bento profile cell's rect, expressed in
  // sticky-relative coords (== pinned viewport coords). Measured after layout
  // and on resize; a ref mirrors it for the per-frame scroll handler.
  const finalBoxRef = useRef(null)
  useEffect(() => {
    const measure = () => {
      const tile = profileTileRef.current
      const sticky = stickyRef.current
      if (!tile || !sticky) return
      const t = tile.getBoundingClientRect()
      const s = sticky.getBoundingClientRect()
      // Sticky child pins at viewport (0,0); subtracting its origin yields the
      // tile's pinned-state rect regardless of current scroll position.
      const box = { left: t.left - s.left, top: t.top - s.top, w: t.width, h: t.height }
      finalBoxRef.current = box
      // If we're already parked at/after the landing (settled desktop card),
      // keep it on the freshly-measured tile — covers a resize while the bento
      // is on screen (no scroll event to re-run the flight handler).
      if (progress.get() >= 0.48) {
        aboutLeft.set(box.left); aboutTop.set(box.top)
        aboutW.set(box.w); aboutH.set(box.h)
      }
    }
    measure()
    const raf = requestAnimationFrame(measure)
    const late = setTimeout(measure, 300) // catch late font/layout shifts
    window.addEventListener('resize', measure)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(late)
      window.removeEventListener('resize', measure)
    }
  }, [isMobile, progress, aboutLeft, aboutTop, aboutW, aboutH])

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
  // The white panel INK-DISSOLVES out across 0.30→0.42, matching the cards,
  // which dissolve just before it. It's a full-bleed flat fill, so the ink
  // filter's displacement/blur would have no visible interior detail to chew
  // on — the honest dissolve is a straight fade.
  const panelOpacity = useTransform(progress, (p) => 1 - clamp01((p - 0.30) / 0.12))
  // Centre cell hides near-instantly UNDER the now-opaque overlay (which has
  // already taken over the same rect + shell at 0.298) — so there is no visible
  // crossfade, just a covered hand-off.
  const profileCellHide = useTransform(progress, [0.298, 0.302], [1, 0])

  // Leave: no exit effect. The settled bento holds through the tail of the
  // scroll, then the sticky releases and the whole stack scrolls up flush into
  // Projects (which sits -2px beneath) — one continuous handoff.

  // ── Drive the overlay portrait from the centre cell's actual DOM rect ──────
  // The overlay takes over the gallery centre cell (0.30) and moves DIRECTLY to
  // the bento profile tile (0.30→0.48) — no centre expansion or hold. Desktop:
  // it settles there as the profile card and stays. Mobile: it fades out at
  // landing as the in-grid photo fades in (so the photo pans with the bento).
  useMotionValueEvent(progress, 'change', (v) => {
    const mobile = window.innerWidth < 768

    // Keep the centre-cell rect fresh while the wall is settled; freeze it once
    // the handoff begins so the move starts from a stable point.
    if (v >= 0.27 && profileCellRef.current) {
      if (v < 0.30 || !cellRectRef.current) {
        cellRectRef.current = profileCellRef.current.getBoundingClientRect()
      }
    }

    if (v < 0.298) {
      aboutOpacity.set(0)
      return
    }

    const rect = cellRectRef.current
    if (!rect) return

    const final = finalBoxRef.current
    if (!final) return

    // Instant, fully-opaque take-over (no start crossfade): the overlay appears
    // matching the gallery cell's exact rect AND shell while the in-grid cell
    // hides underneath it, so the swap is imperceptible. Mobile alone fades the
    // overlay out at landing as the in-grid bento photo fades in.
    const fadeOut = mobile ? 1 - clamp01((v - 0.48) / 0.03) : 1
    aboutOpacity.set(fadeOut)

    // Single eased BOX morph from the gallery cell → bento profile tile. We move
    // the real left/top/width/height so the aspect interpolates tall-portrait →
    // square; the object-cover image re-crops continuously (objectPosition keeps
    // the face pinned) — no uniform-scale aspect snap, so no crossfade is needed.
    const start = { left: rect.left, top: rect.top, w: rect.width, h: rect.height }
    const t = easeInOut(clamp01((v - 0.30) / 0.18)) // 0.30 → 0.48
    const cur = lerpRect(start, final, t)
    aboutLeft.set(cur.left)
    aboutTop.set(cur.top)
    aboutW.set(cur.w)
    aboutH.set(cur.h)

    // Morph the shell cell-look → tile-look along the same eased flight. The box
    // is real-sized now, so these are direct (no counter-scaling).
    aboutRadius.set(lerp(CELL_RADIUS, RADIUS, t))
    aboutBorderColor.set(`rgba(255,255,255,${lerp(CELL_BORDER_A, TILE_BORDER_A, t).toFixed(3)})`)
    const sy = lerp(CELL_SHADOW.y, TILE_SHADOW.y, t).toFixed(1)
    const sb = lerp(CELL_SHADOW.blur, TILE_SHADOW.blur, t).toFixed(1)
    const sr = Math.round(lerp(CELL_SHADOW.r, TILE_SHADOW.r, t))
    const sg = Math.round(lerp(CELL_SHADOW.g, TILE_SHADOW.g, t))
    const sbl = Math.round(lerp(CELL_SHADOW.b, TILE_SHADOW.b, t))
    // Fade the overlay's shadow in across the cell-hide window (0.298→0.302) so
    // it cross-fades with the in-grid cell's identical, fading shadow instead of
    // briefly stacking on it — the stack was the hand-off shadow flicker.
    const shadowFade = clamp01((v - 0.298) / 0.004)
    const sa = (lerp(CELL_SHADOW.a, TILE_SHADOW.a, t) * shadowFade).toFixed(3)
    aboutShadow.set(`0 ${sy}px ${sb}px rgba(${sr},${sg},${sbl},${sa})`)
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

      <div ref={stickyRef} className="sticky top-0 overflow-hidden" style={{ height: '100vh' }}>
        <div style={{ width: '100%', height: '100%' }}>

          {/* ── White gallery panel ─────────────────────────────────────────── */}
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

          {/* ── About — bento grid (settled state + profile landing site) ───── */}
          <AboutBento progress={progress} isMobile={isMobile} profileTileRef={profileTileRef} />

          {/* ── About — profile card (flight vehicle → settled card) ────────── */}
          {/* Takes over the gallery centre cell and moves to the bento profile  */}
          {/* tile. Carries the same glass material as the tiles/navbar.         */}
          <motion.div
            style={{
              position: 'absolute',
              left: aboutLeft,
              top: aboutTop,
              width: aboutW,
              height: aboutH,
              opacity: aboutOpacity,
              borderRadius: aboutRadius,
              overflow: 'hidden',
              borderStyle: 'solid',
              borderWidth: 1,
              borderColor: aboutBorderColor,
              boxShadow: aboutShadow,
              zIndex: 3,
              pointerEvents: 'none',
            }}
          >
            <img
              src="/art/profile.webp"
              alt="Andrew Jiang"
              className="absolute inset-0 w-full h-full object-cover"
              style={{ objectPosition: 'top center' }}
            />
          </motion.div>

        </div>
      </div>
    </motion.div>
  )
}
