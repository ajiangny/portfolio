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
 * Entrance: a one-time, row-staggered fade-in plays when the cluster first
 * enters the viewport (top row first), driven by a single `entrance` motion
 * value + IntersectionObserver (useInView, once).
 *
 * Dissolve: on scroll the OUTER cells dissolve inward (ring by ring), leaving
 * only the profile, which About.jsx hands off to an expanding portrait overlay.
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
import { useMemo, useState, useEffect, useRef } from 'react'
import { motion, useTransform, useMotionValue, useInView, useReducedMotion, animate } from 'framer-motion'

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

// ── Entrance (one-time, row-staggered) — normalised to entrance 0→1 ──────────
const ROW_STAGGER = 0.16 // delay added per row, top row first
const REVEAL_SPAN = 0.55 // how long a single row takes to fade in
const ENTER_DURATION = 0.95 // seconds for the whole entrance
// Each card expands a touch past its resting size, then settles back to 1.
const ENTER_SCALE_FROM = 0.92
const ENTER_SCALE_PEAK = 1.06

// ── Dissolve timing ─────────────────────────────────────────────────────────
const DISSOLVE_START = 0.15
const RING_STEP = 0.05
const DURATION = 0.07

const pick = (arr, r) => arr[Math.min(r, arr.length - 1)]

function Cell({ src, progress, entrance, layout, isProfile, profileHideOpacity, cellRef }) {
  const reveal = useTransform(entrance, [layout.rowDelay, layout.rowDelay + REVEAL_SPAN], [0, 1])
  const dissolve = useTransform(progress, [layout.dissolveStart, layout.dissolveStart + DURATION], [1, 0])
  // One source of truth for opacity: entrance reveal × (dissolve | profile hide)
  // × resting opacity. Single hook, unconditional — isProfile only branches the
  // arithmetic, never the hook count.
  const opacity = useTransform(
    [reveal, dissolve, profileHideOpacity],
    ([r, d, hide]) => (isProfile ? r * hide : r * d * layout.baseOpacity),
  )
  // Entrance pop: each card expands past its resting size, then settles to 1.
  // Centering lives in x/y (−50%) so Framer composes translate × scale around
  // the cell centre — the card stays pinned to its anchor as it scales.
  const scale = useTransform(reveal, [0, 0.6, 1], [ENTER_SCALE_FROM, ENTER_SCALE_PEAK, 1])

  return (
    <motion.div
      ref={cellRef}
      className="absolute overflow-hidden"
      style={{
        left: `${layout.left}px`,
        top: `${layout.top}px`,
        width: `${layout.w}px`,
        height: `${layout.h}px`,
        x: '-50%',
        y: '-50%',
        scale,
        borderRadius: `${layout.radius}px`,
        opacity,
        boxShadow: layout.shadow,
        zIndex: layout.z,
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

  // ── One-time entrance fade-in, row-staggered, fired on first viewport entry.
  const rootRef = useRef(null)
  const entrance = useMotionValue(0)
  const inView = useInView(rootRef, { once: true, amount: 0.35 })
  const reduced = useReducedMotion()
  useEffect(() => {
    if (reduced) { entrance.set(1); return }
    if (!inView) return
    const controls = animate(entrance, 1, { duration: ENTER_DURATION, ease: 'easeOut' })
    return () => controls.stop()
  }, [inView, reduced, entrance])

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
        // Entrance: top row first.
        rowDelay: row * ROW_STAGGER,
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

    // 4) Resolve to pixels.
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
    }))

    return { containerW, containerH, cells }
  }, [images, cols, centerCol, centerRow, maxCheby, profileIndex, fitVw, navClearancePx, vp])

  return (
    <div
      ref={rootRef}
      className="relative"
      style={{ width: `${containerW}px`, height: `${containerH}px` }}
    >
      {cells.map((c) => (
        <Cell
          key={c.i}
          src={c.src}
          progress={progress}
          entrance={entrance}
          layout={c}
          isProfile={c.isProfile}
          profileHideOpacity={profileHideOpacity}
          cellRef={c.isProfile ? profileCellRef : undefined}
        />
      ))}
    </div>
  )
}
