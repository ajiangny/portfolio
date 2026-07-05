/**
 * Gallery.jsx — Gallery Section ("drifting print-desk")
 *
 * A 240vh scroll-pinned section where the artworks float freely on a
 * contained stage instead of sitting in a grid (design system: MASTER.md):
 *
 *   • Ambient drift — each piece wanders on its own slow (8–14s) path,
 *     pausing while hovered or dragged
 *   • Drag — pieces are draggable 1:1 with a soft glide-to-stop, constrained
 *     inside the stage so nothing escapes or clips
 *   • Click-to-front — pointer-down raises a piece above the others;
 *     tapping the piece that is already at the front opens the lightbox
 *   • Scroll choreography — staggered drift-in on arrival, slip-away on
 *     exit toward Contact (same gap/pin progress pattern as before)
 *   • Mobile (≤767px) — the stage widens to 200vw inside a native
 *     horizontal scroller; pieces still drift and drag
 *
 * Scatter spots live in DESKTOP_SPOTS / MOBILE_SPOTS below — one per
 * artwork plus a final spot for the "View All" card. When adding artwork
 * beyond 24, append a spot to BOTH arrays.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import {
  motion, useTransform, useSpring, useMotionValue,
  AnimatePresence, useReducedMotion,
} from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import useInkFilter from '../hooks/useInkFilter'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import GalleryLightbox from './gallery/GalleryLightbox'
import { artworks } from '../data/galleryData'

// ─── Scatter layout ───────────────────────────────────────────────
// x/y are % of the stage (top-left of the piece), t = size tier (width;
// height follows each artwork's natural aspect ratio from galleryData).
// The last spot is reserved for the "View All" card. Overlap is
// intentional (pieces raise on click); the mount-time clamp in
// FloatingPiece pulls any overflowing piece back inside the stage on
// small viewports.
const DESKTOP_SPOTS = [
  { x: 2, y: 10, t: 'L' }, { x: 13, y: 58, t: 'M' },
  { x: 16, y: 6, t: 'S' }, { x: 28, y: 14, t: 'L' },
  { x: 25, y: 44, t: 'M' }, { x: 40, y: 62, t: 'M' },
  { x: 41, y: 4, t: 'M' }, { x: 50, y: 28, t: 'L' },
  { x: 55, y: 68, t: 'S' }, { x: 66, y: 8, t: 'M' },
  { x: 70, y: 46, t: 'M' }, { x: 82, y: 12, t: 'S' },
  { x: 84, y: 56, t: 'S' }, { x: 5, y: 36, t: 'S' },
  { x: 35, y: 30, t: 'S' }, { x: 60, y: 48, t: 'S' },
  { x: 86, y: 30, t: 'S' },
  // artworks 18–24
  { x: 20, y: 72, t: 'M' }, { x: 45, y: 78, t: 'S' },
  { x: 72, y: 72, t: 'M' }, { x: 8, y: 80, t: 'S' },
  { x: 56, y: 82, t: 'S' }, { x: 33, y: 84, t: 'M' },
  { x: 90, y: 62, t: 'S' },
  { x: 76, y: 74, t: 'S' }, // View All
]
const MOBILE_SPOTS = [
  { x: 2, y: 8, t: 'L' }, { x: 10, y: 52, t: 'S' },
  { x: 16, y: 14, t: 'S' }, { x: 22, y: 46, t: 'M' },
  { x: 28, y: 6, t: 'M' }, { x: 34, y: 54, t: 'S' },
  { x: 40, y: 16, t: 'M' }, { x: 46, y: 46, t: 'M' },
  { x: 53, y: 8, t: 'S' }, { x: 58, y: 38, t: 'M' },
  { x: 64, y: 10, t: 'M' }, { x: 71, y: 56, t: 'S' },
  { x: 76, y: 14, t: 'S' }, { x: 81, y: 42, t: 'M' },
  { x: 88, y: 8, t: 'S' }, { x: 68, y: 64, t: 'S' },
  { x: 78, y: 26, t: 'S' },
  // artworks 18–24
  { x: 12, y: 70, t: 'M' }, { x: 30, y: 76, t: 'S' },
  { x: 50, y: 68, t: 'M' }, { x: 6, y: 82, t: 'S' },
  { x: 60, y: 80, t: 'S' }, { x: 40, y: 84, t: 'M' },
  { x: 74, y: 72, t: 'S' },
  { x: 84, y: 54, t: 'S' }, // View All
]

// Piece sizing (MASTER.md → Piece geometry). Tiers set the width; the
// min() also caps piece HEIGHT (42vh desktop / 36vh mobile) via the
// aspect ratio, so tall portraits never outgrow short viewports.
const TIER_W = {
  S: 'clamp(110px, 11vw, 190px)',
  M: 'clamp(130px, 13.5vw, 235px)',
  L: 'clamp(150px, 16vw, 275px)',
}
const TIER_W_MOBILE = { S: '30vw', M: '36vw', L: '42vw' }

function pieceWidth(t, ratio, isMobile) {
  return isMobile
    ? `min(${TIER_W_MOBILE[t]}, calc(36vh * ${ratio}))`
    : `min(${TIER_W[t]}, calc(42vh * ${ratio}))`
}

// Keep pieces this far (px) inside the stage — covers the ambient drift
// amplitude + the bounding-box growth from the base tilt, so a piece
// parked against the constraint edge still never clips.
const EDGE_PAD = 40
const EDGE_PAD_MOBILE = 26

// Deterministic pseudo-random in [0, 1) — stable per piece across renders
// so drift paths and tilts don't reshuffle on re-render.
function prand(i, salt) {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453
  return s - Math.floor(s)
}

// ─── Scroll choreography (per piece) ──────────────────────────────
// Staggered drift-in over the seam-gap progress, slip-away over the
// pin progress — same windows idea as the old grid reveal.
function usePieceReveal(index, total, revealProgress, exitProgress) {
  const inStart = 0.45 + (index / total) * 0.4
  const inEnd = inStart + 0.15
  const outStart = 0.78 + (index / total) * 0.13
  const outEnd = outStart + 0.08

  const inO = useTransform(revealProgress, [inStart, inEnd], [0, 1])
  const outO = useTransform(exitProgress, [outStart, outEnd], [1, 0])
  const opacity = useTransform([inO, outO], ([a, b]) => a * b)

  const inY = useTransform(revealProgress, [inStart, inEnd], [48, 0])
  const outY = useTransform(exitProgress, [outStart, outEnd], [0, -36])
  const y = useTransform([inY, outY], ([a, b]) => a + b)

  const inS = useTransform(revealProgress, [inStart, inEnd], [0.94, 1])
  const outS = useTransform(exitProgress, [outStart, outEnd], [1, 0.96])
  const scale = useTransform([inS, outS], ([a, b]) => a * b)

  return { opacity, y, scale }
}

// ─── Floating piece shell ─────────────────────────────────────────
// Three nested transforms, one element each so they never fight:
//   outer  — anchor position + scroll entry/exit (opacity/y/scale)
//   drag   — pointer drag x/y + base tilt + hover/drag scale
//   drift  — ambient wander keyframes (paused on hover/drag)
function FloatingPiece({
  index, total, spot, ratio, stageRef, isMobile, zIndex, isFront,
  onRaise, onActivate, revealProgress, exitProgress, label,
  frameClassName = '', children,
}) {
  const reduceMotion = useReducedMotion()
  const outerRef = useRef(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const [constraints, setConstraints] = useState(null)
  const [paused, setPaused] = useState(false)
  const wasFrontRef = useRef(false)

  const { opacity, y: entryY, scale: entryScale } =
    usePieceReveal(index, total, revealProgress, exitProgress)

  // Deterministic personality
  const tilt = prand(index, 1) * 8 - 4
  const driftDur = 8 + prand(index, 2) * 6
  const ampBase = isMobile ? 8 : 14
  const ampSpan = isMobile ? 14 : 20
  const dx = ampBase + prand(index, 3) * ampSpan
  const dy = ampBase + prand(index, 4) * ampSpan
  const dr = 0.6 + prand(index, 5) * 0.6

  // Measure drag bounds against the stage and pull any initially
  // overflowing piece back inside (short viewports, resizes).
  useEffect(() => {
    const measure = () => {
      const el = outerRef.current
      const stage = stageRef.current
      if (!el || !stage) return
      const pad = isMobile ? EDGE_PAD_MOBILE : EDGE_PAD
      const left = pad - el.offsetLeft
      const top = pad - el.offsetTop
      const right = stage.clientWidth - pad - el.offsetLeft - el.offsetWidth
      const bottom = stage.clientHeight - pad - el.offsetTop - el.offsetHeight
      const c = {
        left: Math.min(left, right), right: Math.max(left, right),
        top: Math.min(top, bottom), bottom: Math.max(top, bottom),
      }
      setConstraints(c)
      x.set(Math.max(c.left, Math.min(c.right, x.get())))
      y.set(Math.max(c.top, Math.min(c.bottom, y.get())))
    }
    // Slight timeout so clamp()/vh sizes settle before measuring
    const t = setTimeout(measure, 60)
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [isMobile, spot, stageRef, x, y])

  const interact = () => {
    wasFrontRef.current = isFront
    onRaise()
  }

  const drifting = !(reduceMotion || paused)

  return (
    <motion.div
      ref={outerRef}
      style={{
        position: 'absolute',
        left: `${spot.x}%`,
        top: `${spot.y}%`,
        width: pieceWidth(spot.t, ratio, isMobile),
        aspectRatio: ratio,
        zIndex,
        opacity,
        ...(reduceMotion ? {} : { y: entryY, scale: entryScale }),
      }}
    >
      <motion.div
        className={`gallery-piece${isFront ? ' is-front' : ''}`}
        style={{ x, y, rotate: tilt, width: '100%', height: '100%' }}
        drag={!!constraints}
        dragConstraints={constraints || undefined}
        dragElastic={0.08}
        dragTransition={{ power: 0.2, timeConstant: 200 }}
        whileHover={{ scale: 1.03 }}
        whileDrag={{ scale: 1.05 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        onPointerDown={interact}
        onHoverStart={() => setPaused(true)}
        onHoverEnd={() => setPaused(false)}
        onDragStart={() => setPaused(true)}
        onDragEnd={() => setPaused(false)}
        onTap={() => { if (wasFrontRef.current) onActivate() }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (isFront) onActivate()
            else onRaise()
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={label}
      >
        <motion.div
          className={`gallery-piece-frame ${frameClassName}`}
          animate={drifting
            ? { x: [0, dx, -dx * 0.6, 0], y: [0, -dy * 0.7, dy, 0], rotate: [0, dr, -dr, 0] }
            : { x: 0, y: 0, rotate: 0 }}
          transition={drifting
            ? { duration: driftDur, repeat: Infinity, ease: 'easeInOut' }
            : { duration: 0.6, ease: 'easeOut' }}
        >
          {children}
        </motion.div>
      </motion.div>
    </motion.div>
  )
}

// ─── "View All" card content ──────────────────────────────────────
// Teaser for the future gallery page — hover (or tap-activate on touch)
// flips the label to "Coming Soon".
function ViewAllContent({ showSoon, onHover }) {
  return (
    <div
      className="gallery-piece-viewall"
      onMouseEnter={() => onHover(true)}
      onMouseLeave={() => onHover(false)}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={showSoon ? 'soon' : 'all'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="gallery-piece-viewall-label"
        >
          {showSoon ? 'Coming Soon' : (
            <>
              View All
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M2.5 9.5L9.5 2.5M4 2.5h5.5V8" />
              </svg>
            </>
          )}
        </motion.span>
      </AnimatePresence>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function Gallery() {
  const containerRef = useRef(null)
  const stageRef = useRef(null)
  const lenisRef = useLenisContext()

  // Sticky travel = container (240vh) − viewport (100vh) = 140vh.
  const rawProgress = useScrollTimeline(containerRef, 1.4)
  const progress = useSpring(rawProgress, { stiffness: 240, damping: 30 })

  // ── Scroll gap progress (seam from Projects) ────────────────────
  const gapProgressRaw = useMotionValue(0)
  const gapProgress = useSpring(gapProgressRaw, { stiffness: 300, damping: 40 })

  useEffect(() => {
    let unlisten = () => {}
    const t = setTimeout(() => {
      const lenis = lenisRef?.current
      if (!lenis) return

      const check = ({ scroll }) => {
        const el = containerRef.current
        if (!el) return

        const start = el.offsetTop - 1.45 * window.innerHeight
        const end = el.offsetTop

        let gp = 0
        if (scroll >= start && scroll <= end) {
          gp = (scroll - start) / (end - start)
        } else if (scroll > end) {
          gp = 1
        }

        gapProgressRaw.set(gp)
      }

      check({ scroll: lenis.scroll ?? window.scrollY })

      // Native fallback: Lenis doesn't emit for scrolls it didn't drive
      // (keyboard paging, anchor/programmatic jumps) — without this the
      // reveal clock stalls at 0 and the stage never fades in.
      const nativeCheck = () => check({ scroll: window.scrollY })
      lenis.on('scroll', check)
      window.addEventListener('scroll', nativeCheck, { passive: true })
      unlisten = () => {
        lenis.off('scroll', check)
        window.removeEventListener('scroll', nativeCheck)
      }
    }, 0)
    return () => { clearTimeout(t); unlisten() }
  }, [lenisRef, gapProgressRaw])

  const revealRaw = useTransform(gapProgress, [0.35, 1.0], [0, 1])

  // Section reveal = ink dissolve (shared InkDissolve filter): ONE filter over
  // the whole stage settles as the seam progress runs, so the staggered pieces
  // drift in through resolving ink. Scrubbed both ways; 'none' once settled.
  const reduceMotion = useReducedMotion()
  const { defs: inkDefs, filter: inkFilter } = useInkFilter(revealRaw, { maxScale: 60, maxBlur: 8, octaves: 2 })

  // ── Combined layer opacity: entry × exit ────────────────────────
  const layerExitO = useTransform(progress, [0.82, 1.0], [1, 0])
  const layerEntryO = useTransform(gapProgress, [0, 0.05], [0, 1])
  const layerOpacity = useTransform([layerEntryO, layerExitO], ([inO, outO]) => inO * outO)
  // The stage layer is position:fixed and always mounted, so when invisible
  // it must also be visibility:hidden — pointer-events:none alone is undone
  // by interactive children (draggable pieces re-enable pointer events,
  // making the Gallery tappable from other sections).
  const layerVisibility = useTransform(layerOpacity, (o) => (o > 0.02 ? 'visible' : 'hidden'))

  const stagePointerEvents = useTransform(
    [revealRaw, progress],
    ([r, p]) => (r > 0.6 && p < 0.85) ? 'auto' : 'none'
  )

  const hintOpacity = useTransform(revealRaw, [0.85, 1], [0, 1])

  // ── Z-order: raise on interaction, front-most tap opens lightbox ─
  const zCounter = useRef(artworks.length + 2)
  const [zMap, setZMap] = useState({})
  const [frontId, setFrontId] = useState(null)

  const raise = useCallback((id) => {
    zCounter.current += 1
    const z = zCounter.current
    setFrontId(id)
    setZMap((m) => ({ ...m, [id]: z }))
  }, [])

  // ── Lightbox state ──────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Pause Lenis while the lightbox is open so the page can't scroll under it
  useEffect(() => {
    const lenis = lenisRef?.current
    if (!lenis) return
    if (lightboxIndex !== null) lenis.stop()
    else lenis.start()
    return () => lenis.start()
  }, [lightboxIndex, lenisRef])

  // ── View All flash (touch has no hover) ─────────────────────────
  const [viewAllSoon, setViewAllSoon] = useState(false)
  const flashViewAll = useCallback(() => {
    setViewAllSoon(true)
    setTimeout(() => setViewAllSoon(false), 1600)
  }, [])

  const isMobile = useMediaQuery('(max-width: 767px)')
  const spots = isMobile ? MOBILE_SPOTS : DESKTOP_SPOTS
  const totalPieces = artworks.length + 1 // + View All card
  const viewAllSpot = spots[artworks.length] ?? spots[spots.length - 1]

  const pieces = (
    <>
      {artworks.map((art, i) => (
        <FloatingPiece
          key={art.id}
          index={i}
          total={totalPieces}
          spot={spots[i]}
          ratio={art.w / art.h}
          stageRef={stageRef}
          isMobile={isMobile}
          zIndex={zMap[`a${art.id}`] ?? i + 1}
          isFront={frontId === `a${art.id}`}
          onRaise={() => raise(`a${art.id}`)}
          onActivate={() => setLightboxIndex(i)}
          revealProgress={revealRaw}
          exitProgress={progress}
          label={`${art.title || art.medium} — drag to move, click again to view`}
        >
          <img
            src={art.src}
            alt={art.title || art.medium}
            className="gallery-piece-img"
            loading="lazy"
            draggable={false}
          />
          <div className="gallery-piece-overlay">
            <span className="font-mono text-cream/90 text-label uppercase tracking-[0.2em]">
              {art.medium}
            </span>
          </div>
        </FloatingPiece>
      ))}
      <FloatingPiece
        key="viewall"
        index={artworks.length}
        total={totalPieces}
        spot={viewAllSpot}
        ratio={1}
        stageRef={stageRef}
        isMobile={isMobile}
        zIndex={zMap.viewall ?? artworks.length + 1}
        isFront={frontId === 'viewall'}
        onRaise={() => raise('viewall')}
        onActivate={flashViewAll}
        revealProgress={revealRaw}
        exitProgress={progress}
        label="View all artwork — coming soon"
        frameClassName="gallery-piece-frame-viewall"
      >
        <ViewAllContent showSoon={viewAllSoon} onHover={setViewAllSoon} />
      </FloatingPiece>
    </>
  )

  return (
    <div id="gallery" ref={containerRef} style={{ height: '240vh' }}>

      {/* Screen-reader landmark — kept outside the visibility-gated fixed
          layer so it stays in the document outline at all times. */}
      <h2 className="sr-only">Gallery</h2>

      {/* ── Fixed stage layer — z-50 puts it ABOVE the Projects overlay (z-40) ── */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50,
          pointerEvents: 'none',
          opacity: layerOpacity,
          visibility: layerVisibility,
        }}
      >
        <motion.div
          className="gallery-stage-viewport"
          style={{ pointerEvents: stagePointerEvents, filter: reduceMotion ? 'none' : inkFilter }}
        >
          {inkDefs}
          {isMobile ? (
            <div className="gallery-stage-scroller">
              <div
                className="gallery-stage is-wide"
                ref={stageRef}
                role="group"
                aria-label="Floating gallery — drag artworks to rearrange, swipe sideways to roam"
              >
                {pieces}
              </div>
            </div>
          ) : (
            <div
              className="gallery-stage"
              ref={stageRef}
              role="group"
              aria-label="Floating gallery — drag artworks to rearrange"
            >
              {pieces}
            </div>
          )}

          <motion.p className="gallery-hint" style={{ opacity: hintOpacity }}>
            drag the prints · take your time{isMobile ? ' · swipe →' : ''}
          </motion.p>
        </motion.div>
      </motion.div>

      {/* ── Lightbox ── */}
      <AnimatePresence>
        {lightboxIndex !== null && (
          <GalleryLightbox
            artworks={artworks}
            initialIndex={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
          />
        )}
      </AnimatePresence>

      {/* ── Sticky pin frame ─────────────────────────────────────────── */}
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* Empty background scrolls up behind the fixed stage and pins */}
      </div>
    </div>
  )
}
