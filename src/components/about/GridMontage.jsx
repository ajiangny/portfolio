/**
 * GridMontage.jsx — About Section Gallery Cluster
 *
 * A layered depth cluster of artwork with the profile photo dead-centre and
 * largest. Cells recede in size by ring (Chebyshev distance from centre) and
 * tuck BEHIND their inner neighbours (z-index by ring + slight overlap), giving
 * a hierarchical, stacked-photo look rather than a flat grid.
 *
 * Hierarchy cues:
 *   • size       — scales down per ring (SCALE_BY_RING)
 *   • opacity    — resting opacity falls off per ring (OPACITY_BY_RING); the
 *                  closer to centre, the more opaque.
 *   • middle row — wider horizontal gap (STEP_X_MID) than the outer rows.
 *   • centre col — full-height portraits; every other column is shorter
 *                  (COL_HEIGHT), so the central vertical strip reads tallest.
 *
 * Entrance: each card WIPES itself in (clip-path, no fade) when that card
 * individually enters the viewport — a per-card IntersectionObserver fires a
 * bottom-up wipe, so the wall reveals progressively as the section rises into
 * view rather than all at once. Cards reveal at their resting per-ring opacity
 * (the dimmer outer rings stay dim — the wipe never touches opacity).
 *
 * Exit: on scroll the OUTER cells wipe UP (ring by ring — bottom inset grows,
 * no fade), leaving only the profile, which About.jsx hands off to an expanding
 * portrait overlay.
 *
 * Parallax + tilt: each OUTER card carries a 3D tilt that grows with its
 * distance from centre (a concave gallery wall) and drifts apart as you scroll
 * into the section (scroll depth-parallax, rate ∝ distance). Both are layered
 * on an inner card wrapper so the outer cell's measured rect, opacity and
 * z-index ring stacking are untouched. The centre profile (distance 0) gets
 * ZERO tilt/parallax, so the portrait handoff rect stays exact. Tilt rides the
 * entrance reveal; parallax rides `progress`; both off under reduced motion.
 *
 * Performance: every per-cell opacity is the product of three motion values
 * (entrance reveal × dissolve × resting opacity) resolved in ONE useTransform —
 * no geometry change, so the fade is a pure compositor op over the live WebGL
 * gradient.
 *
 * Sizing: every dimension is proportional to a single derived `cellW`. We
 * compute the cluster's normalised extent (in cellW units) from the constants
 * below, then solve `cellW` so the whole cluster fits inside both the available
 * viewport height (100vh − navClearancePx) and `fitVw`% of the width — so it is
 * always centred and never clips, with the navbar safe-zone respected.
 */
import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import { motion, useTransform, useMotionValue, useReducedMotion, animate } from 'framer-motion'

// ── Cluster geometry (relative to a unit cellW; cellH = cellW × ASPECT) ──────
const ASPECT = 1.5 // portrait 2:3 (h / w)
// Per-ring scale: centre 1.0, then progressively smaller as cells recede.
const SCALE_BY_RING = [1, 0.74, 0.54]
// Resting opacity per ring: centre solid, outer cards fade back.
const OPACITY_BY_RING = [1, 0.82, 0.55]
// Spacing between adjacent cell CENTRES, in cell units. < cell size ⇒ overlap.
const STEP_X = 0.96 // × cellW — outer rows
const STEP_X_MID = 1.16 // × cellW — middle row gets a wider horizontal gap
const STEP_Y = 0.64 // × cellH
// Non-centre columns are slightly shorter (× full height) so the centre column
// reads as the tallest vertical strip.
const COL_HEIGHT = 0.88
// The middle row reads slightly larger overall.
const MID_ROW_SCALE = 1.1

// ── Entrance (per-card wipe — no fade — fired when each card enters view) ─────
const REVEAL_AMOUNT = 0.25 // fraction of a card visible before its wipe fires
// Pulls the observer's trigger line UP from the viewport bottom so cards stay
// hidden until they've risen well into view (they wipe in late, near settle).
// More-negative bottom % = later, but the bottom row settles low — past ~-22%
// it can never clear REVEAL_AMOUNT and would stay hidden. '0px' = peeks-in.
const REVEAL_ROOT_MARGIN = '0px 0px -20% 0px'
const WIPE_DURATION = 0.55 // seconds for one card's wipe
const WIPE_EASE = [0.22, 1, 0.36, 1] // crisp ease-out, no overshoot
// One clip-path drives both wipes (both travel UP): the TOP inset shrinks
// 100%→0% to reveal a card from its bottom edge up (entrance), then the BOTTOM
// inset grows 0%→100% to wipe it away bottom-up (exit, replacing the fade). At
// rest both are 0 → 'none' so the card's drop shadow (painted outside the box,
// which inset(0) would clip) is restored.
const wipeClip = (top, bottom) =>
  top <= 0 && bottom <= 0
    ? 'none'
    : `inset(${top.toFixed(2)}% 0% ${bottom.toFixed(2)}% 0%)`

// ── Dissolve timing ─────────────────────────────────────────────────────────
const DISSOLVE_START = 0.15
const RING_STEP = 0.05
const DURATION = 0.07

// ── Parallax + tilt (scroll depth drift) ────────────────────────────────────
// Outer cards tilt in 3D (concave wall) and drift apart as you scroll into the
// wall; magnitude scales with distance from centre. Centre (dx=dy=0) → all
// zero, so the profile cell never moves and the handoff rect stays exact.
const TILT_PER_COL = 6 // deg of rotateY per column step from centre
const TILT_PER_ROW = 7 // deg of rotateX per row step from centre
const TILT_MAX = 15 // clamp per-axis tilt so far corners stay legible (deg)
const TILT_PERSPECTIVE = 1000 // px — per-cell perspective for the foreshortening
const PARALLAX_X = 0.05 // outward horizontal drift per column step, × cellW
const PARALLAX_Y = 0.035 // outward vertical drift per row step, × cellW
const PARALLAX_END = 0.15 // progress at which the drift reaches full depth

const pick = (arr, r) => arr[Math.min(r, arr.length - 1)]
const clampN = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

function Cell({ src, progress, layout, isProfile, profileHideOpacity, cellRef, reduced }) {
  // Per-card wipe: a clip-path reveal (0 → 1) fired once when THIS card enters
  // the viewport, so the wall reveals progressively as the section rises — not
  // all at once. `reveal` never touches opacity, so the wipe is fade-free.
  const reveal = useMotionValue(reduced ? 1 : 0)
  // Observe the OUTER (unclipped) cell — never the inner card. The inner starts
  // at clip-path inset(100%), which zeroes its intersection area, so an observer
  // on it would never fire (the clip would gate its own reveal — a deadlock).
  // Merge the observed ref with cellRef so the profile still exposes its rect.
  const outerRef = useRef(null)
  const setOuterRef = useCallback((node) => {
    outerRef.current = node
    if (cellRef) cellRef.current = node
  }, [cellRef])
  useEffect(() => {
    if (reduced) { reveal.set(1); return }
    const el = outerRef.current
    if (!el) return
    let controls
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          controls = animate(reveal, 1, { duration: WIPE_DURATION, ease: WIPE_EASE })
          io.disconnect()
        }
      },
      { threshold: REVEAL_AMOUNT, rootMargin: REVEAL_ROOT_MARGIN },
    )
    io.observe(el)
    return () => { io.disconnect(); controls?.stop() }
  }, [reduced, reveal])
  // Exit wipe-up: 1 (settled) → 0 (gone), ring-staggered. The profile is handed
  // off to the overlay instead of wiping, so it never gets an exit wipe.
  const dissolve = useTransform(progress, [layout.dissolveStart, layout.dissolveStart + DURATION], [1, 0])
  // Single clip-path = entrance wipe-up (top inset) + exit wipe-up (bottom inset).
  const clipPath = useTransform([reveal, dissolve], ([rv, ds]) =>
    wipeClip((1 - rv) * 100, isProfile ? 0 : (1 - ds) * 100),
  )
  // Opacity is now ONLY the resting per-ring hierarchy (the exit is a wipe, not a
  // fade) — plus the profile-hide handoff for the centre cell. Stays on the OUTER
  // cell so the handoff reads the same box it always did.
  const opacity = useTransform(profileHideOpacity, (hide) => (isProfile ? hide : layout.baseOpacity))
  // 3D tilt rides the wipe reveal (0 → target), so each card tilts into its pose
  // as it wipes in, then holds. Centre cell targets → 0, so it never tilts.
  const rotateX = useTransform(reveal, [0, 1], [0, layout.rotXTarget])
  const rotateY = useTransform(reveal, [0, 1], [0, layout.rotYTarget])
  // Scroll parallax: outer cards drift apart as you scroll into the wall
  // (progress 0 → PARALLAX_END), then hold through the dissolve. Centre → 0.
  const driftX = useTransform(progress, [0, PARALLAX_END], [0, layout.pxTarget])
  const driftY = useTransform(progress, [0, PARALLAX_END], [0, layout.pyTarget])

  return (
    <motion.div
      ref={setOuterRef}
      className="absolute"
      style={{
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        width: `${layout.w}px`,
        height: `${layout.h}px`,
        x: '-50%',
        y: '-50%',
        opacity,
        zIndex: layout.z,
      }}
    >
      <motion.div
        className="absolute inset-0 overflow-hidden"
        style={{
          x: driftX,
          y: driftY,
          rotateX,
          rotateY,
          transformPerspective: TILT_PERSPECTIVE,
          borderRadius: `${layout.radius}px`,
          boxShadow: layout.shadow,
          clipPath,
        }}
      >
        <img
          src={src}
          alt=""
          loading="eager"
          className="absolute inset-0 w-full h-full object-cover"
          style={isProfile ? { objectPosition: 'top center' } : undefined}
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{ borderRadius: `${layout.radius}px`, boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.4)' }}
        />
      </motion.div>
    </motion.div>
  )
}

export default function GridMontage({
  images,
  cols,
  profileIndex,
  progress,
  profileCellRef,
  profileHideOpacity,
  // Max horizontal fraction of the viewport (0–100).
  fitVw = 88,
  // Vertical safe zone in px (navbar clearance + parent padding) — must match
  // About.jsx's wrapper padding so the cluster never overflows under the nav.
  navClearancePx = 96,
}) {
  const rows = Math.ceil(images.length / cols)
  const centerCol = profileIndex % cols
  const centerRow = Math.floor(profileIndex / cols)
  const maxCheby = Math.max(centerCol, cols - 1 - centerCol, centerRow, rows - 1 - centerRow)

  // Entrance is per-card now (each Cell wipes in on its own viewport entry); the
  // cluster only needs the reduced-motion flag for tilt/parallax + wipe gating.
  const reduced = useReducedMotion()

  // Recompute the pixel layout on resize only (never per frame).
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const onResize = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const { containerW, containerH, cells } = useMemo(() => {
    // 1) Per-cell offsets, scale, per-row step, per-column height — all in
    //    cellW units (cellH = cellW × ASPECT).
    const meta = images.map((src, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const dx = col - centerCol
      const dy = row - centerRow
      const cheby = Math.max(Math.abs(dx), Math.abs(dy))
      // Middle row reads slightly larger than the outer rows.
      const s = pick(SCALE_BY_RING, cheby) * (row === centerRow ? MID_ROW_SCALE : 1)
      const stepX = row === centerRow ? STEP_X_MID : STEP_X
      // Height factor (includes ASPECT): centre column full, others shorter.
      const hFactor = ASPECT * (col === centerCol ? 1 : COL_HEIGHT)
      return {
        i, src, dx, dy, col, row, cheby, s, stepX, hFactor,
        isProfile: i === profileIndex,
        // Outermost ring dissolves first.
        dissolveStart: DISSOLVE_START + (maxCheby - cheby) * RING_STEP + (((i * 73) % 25) / 25 - 0.5) * 0.024,
        // Resting opacity: closer to centre ⇒ more opaque.
        baseOpacity: pick(OPACITY_BY_RING, cheby),
      }
    })

    // 2) Cluster extent in cellW units (half-widths/heights from centre).
    let maxHalfW = 0
    let maxHalfH = 0
    for (const m of meta) {
      maxHalfW = Math.max(maxHalfW, Math.abs(m.dx) * m.stepX + m.s / 2)
      maxHalfH = Math.max(maxHalfH, Math.abs(m.dy) * STEP_Y * ASPECT + (m.s * m.hFactor) / 2)
    }
    const clusterW_n = 2 * maxHalfW
    const clusterH_n = 2 * maxHalfH

    // 3) Solve cellW so the cluster fits both constraints.
    const availH = vp.h - navClearancePx
    const availW = (fitVw / 100) * vp.w
    const cellW = Math.floor(Math.min(availW / clusterW_n, availH / clusterH_n))

    const containerW = clusterW_n * cellW
    const containerH = clusterH_n * cellW

    // 4) Resolve to pixels. `motionScale` zeroes every tilt/parallax target
    //    under reduced motion (and is implicitly 0 for the centre profile,
    //    whose dx=dy=0 already null every term — keeping the handoff exact).
    const motionScale = reduced ? 0 : 1
    const cells = meta.map((m) => ({
      ...m,
      w: m.s * cellW,
      h: m.s * m.hFactor * cellW,
      left: containerW / 2 + m.dx * m.stepX * cellW,
      top: containerH / 2 + m.dy * STEP_Y * ASPECT * cellW,
      radius: Math.max(6, Math.round(10 * m.s)),
      // Inner rings sit on top; cardinals edge above diagonals of equal ring.
      z: m.isProfile ? 60 : 40 - m.cheby * 8 + (m.dx === 0 || m.dy === 0 ? 2 : 0),
      // Foreground casts a deeper shadow; receding cells flatten out.
      shadow: m.isProfile
        ? '0 18px 50px rgba(16,20,38,0.34)'
        : `0 ${Math.round(8 + (maxCheby - m.cheby) * 5)}px ${Math.round(22 + (maxCheby - m.cheby) * 14)}px rgba(16,20,38,${(0.16 + (maxCheby - m.cheby) * 0.05).toFixed(2)})`,
      // 3D pose — concave wall: cols rotate around Y toward centre, rows around
      // X; magnitude ∝ steps from centre (clamped). Parallax drifts each card
      // outward (radially) as you scroll in; rate ∝ steps from centre.
      rotXTarget: motionScale * clampN(m.dy * TILT_PER_ROW, -TILT_MAX, TILT_MAX),
      rotYTarget: motionScale * clampN(-m.dx * TILT_PER_COL, -TILT_MAX, TILT_MAX),
      pxTarget: motionScale * m.dx * PARALLAX_X * cellW,
      pyTarget: motionScale * m.dy * PARALLAX_Y * cellW,
    }))

    return { containerW, containerH, cells }
  }, [images, cols, centerCol, centerRow, maxCheby, profileIndex, fitVw, navClearancePx, vp, reduced])

  return (
    <div
      className="relative"
      style={{ width: `${containerW}px`, height: `${containerH}px` }}
    >
      {cells.map((c) => (
        <Cell
          key={c.i}
          src={c.src}
          progress={progress}
          layout={c}
          isProfile={c.isProfile}
          profileHideOpacity={profileHideOpacity}
          cellRef={c.isProfile ? profileCellRef : undefined}
          reduced={reduced}
        />
      ))}
    </div>
  )
}
