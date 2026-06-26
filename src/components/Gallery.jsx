/**
 * Gallery.jsx — Gallery Section
 *
 * A 400vh scroll-driven section displaying artwork in a responsive
 * bento grid (9×3 desktop / 3×5 mobile). Features:
 *
 *   • Staggered card reveal — each card fades in at a slightly offset
 *     scroll threshold for a cascade entrance effect
 *   • Scroll-driven exit — cards scale down and fade as the user
 *     scrolls past, transitioning into the Contact section
 *   • Lightbox — clicking any artwork opens a fullscreen viewer with
 *     keyboard navigation and a thumbnail carousel strip
 *
 * Grid cells beyond the artwork count are filled with blank placeholders
 * to maintain the grid structure.
 */
import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import GalleryLightbox from './gallery/GalleryLightbox'
import { artworks } from '../data/galleryData'


// Artworks are scattered bento-style among blank cells so the grid
// reads as an intentional composition instead of one full row + blanks.
// Desktop: 9 cols × 3 rows (27 cells) — 17 art + View All + 9 scattered blanks.
// Mobile:  3 cols × 6 rows (18 cells) — 17 art + View All, fully packed.
// NOTE: when adding artwork beyond 17, extend these position arrays (and grow
// the grids: another desktop column-set / another mobile row in index.css).
const DESKTOP_CELLS = 27
const MOBILE_CELLS = 18
const DESKTOP_ART_POSITIONS = [0, 1, 3, 4, 6, 8, 10, 11, 12, 14, 15, 17, 18, 20, 22, 23, 25]
const MOBILE_ART_POSITIONS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]
// Bottom-right cell — "View All" teaser for the future gallery page
const DESKTOP_VIEWALL_POSITION = 26
const MOBILE_VIEWALL_POSITION = 17

// ─── Shared cell choreography ─────────────────────────────────────
// Every grid cell (art, blank, view-all) staggers in during the reveal
// window and out during the exit window. Windows are normalized by cell
// count so even the last cell finishes revealing before progress hits 1.
function useCellReveal(index, totalCells, revealProgress, exitProgress) {
  const inStart = 0.55 + (index / totalCells) * 0.30
  const inEnd = inStart + 0.14

  const outStart = 0.80 + (index / totalCells) * 0.11
  const outEnd = outStart + 0.08

  const inOpacity = useTransform(revealProgress, [inStart, inEnd], [0, 1])
  const inScale = useTransform(revealProgress, [inStart, inEnd], [0.85, 1])

  const outOpacity = useTransform(exitProgress, [outStart, outEnd], [1, 0])
  const outScale = useTransform(exitProgress, [outStart, outEnd], [1, 0.9])

  const opacity = useTransform([inOpacity, outOpacity], ([i, o]) => i * o)
  const scale = useTransform([inScale, outScale], ([i, o]) => i * o)

  return { opacity, scale }
}

// ─── Single gallery card ──────────────────────────────────────────
function ArtCard({ art, artIndex, index, totalCells, revealProgress, exitProgress, onSelect }) {
  const { opacity, scale } = useCellReveal(index, totalCells, revealProgress, exitProgress)

  return (
    <motion.div
      style={{ opacity, scale }}
      className="gallery-cell gallery-cell-art group"
      onClick={() => onSelect(artIndex)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(artIndex) } }}
      role="button"
      tabIndex={0}
      aria-label={`View ${art.title || art.medium}`}
    >
      <img
        src={art.src}
        alt={art.title || art.medium}
        className="gallery-cell-img"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="gallery-cell-overlay">
        <span className="font-mono text-cream/90 text-label uppercase tracking-[0.2em]">
          {art.medium}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Blank placeholder cell ───────────────────────────────────────
function BlankCard({ index, totalCells, revealProgress, exitProgress }) {
  const { opacity, scale } = useCellReveal(index, totalCells, revealProgress, exitProgress)

  return (
    <motion.div
      style={{ opacity, scale }}
      className="gallery-cell gallery-cell-blank"
    />
  )
}

// ─── "View All" teaser cell ───────────────────────────────────────
// Links to a dedicated gallery page (not built yet) — hover or tap
// flips the label to "Coming Soon".
function ViewAllCard({ index, totalCells, revealProgress, exitProgress }) {
  const [showSoon, setShowSoon] = useState(false)
  const { opacity, scale } = useCellReveal(index, totalCells, revealProgress, exitProgress)

  const reveal = () => setShowSoon(true)
  const conceal = () => setShowSoon(false)

  return (
    <motion.div
      style={{ opacity, scale }}
      className="gallery-cell gallery-cell-viewall"
      role="button"
      tabIndex={0}
      aria-label="View all artwork — coming soon"
      onMouseEnter={reveal}
      onMouseLeave={conceal}
      onFocus={reveal}
      onBlur={conceal}
      onClick={() => {
        // Touch has no hover — flash the label for a beat instead
        setShowSoon(true)
        setTimeout(() => setShowSoon(false), 1600)
      }}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={showSoon ? 'soon' : 'all'}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          className="gallery-cell-viewall-label"
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
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function Gallery() {
  const containerRef = useRef(null)
  const lenisRef = useLenisContext()

  // Sticky travel = container (340vh) − viewport (100vh) = 240vh,
  // trimmed from 300vh so the run-out into Contact doesn't drag.
  const rawProgress = useScrollTimeline(containerRef, 2.4)
  const progress = useSpring(rawProgress, { stiffness: 240, damping: 30 })

  // ── Scroll gap progress ──────────────────────────────────────────
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

      lenis.on('scroll', check)
      unlisten = () => lenis.off('scroll', check)
    }, 0)
    return () => { clearTimeout(t); unlisten() }
  }, [lenisRef, gapProgressRaw])

  const revealRaw = useTransform(gapProgress, [0.35, 1.0], [0, 1])

  // ── Combined header opacity: entry × exit ───────────────────────
  const headerExitO = useTransform(progress, [0.82, 1.0], [1, 0])
  const headerEntryO = useTransform(gapProgress, [0, 0.05], [0, 1])
  const headerOpacity = useTransform([headerEntryO, headerExitO], ([inO, outO]) => inO * outO)
  // The header layer is position:fixed and always mounted, so when invisible
  // it must also be visibility:hidden — pointer-events:none alone is undone
  // by interactive header children (e.g. links/buttons re-enable pointer
  // events, making the Gallery header tappable from the Hero section).
  const headerVisibility = useTransform(headerOpacity, (o) => (o > 0.02 ? 'visible' : 'hidden'))

  const gridPointerEvents = useTransform(
    [revealRaw, progress],
    ([r, p]) => (r > 0.6 && p < 0.85) ? 'auto' : 'none'
  )

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

  // ── Build the grid with artworks scattered among blanks ─────────
  const isMobile = useMediaQuery('(max-width: 767px)')
  const totalCells = isMobile ? MOBILE_CELLS : DESKTOP_CELLS
  const artPositions = isMobile ? MOBILE_ART_POSITIONS : DESKTOP_ART_POSITIONS
  const viewAllPosition = isMobile ? MOBILE_VIEWALL_POSITION : DESKTOP_VIEWALL_POSITION

  const cells = []
  for (let i = 0; i < totalCells; i++) {
    const artIndex = artPositions.indexOf(i)
    if (artIndex !== -1 && artIndex < artworks.length) {
      cells.push({ type: 'art', art: artworks[artIndex], artIndex, index: i })
    } else if (i === viewAllPosition) {
      cells.push({ type: 'viewall', index: i })
    } else {
      cells.push({ type: 'blank', index: i })
    }
  }

  return (
    <div id="gallery" ref={containerRef} style={{ height: '340vh' }}>

      {/* Screen-reader landmark — kept outside the visibility-gated fixed
          header so it stays in the document outline at all times. */}
      <h2 className="sr-only">Gallery</h2>

      {/* ── Fixed header — z-50 puts it ABOVE the Projects overlay (z-40) ── */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50,
          pointerEvents: 'none',
          opacity: headerOpacity,
          visibility: headerVisibility,
        }}
      >
        {/* 5×3 viewport-filling grid */}
        <motion.div
          className="gallery-grid-viewport"
          style={{ pointerEvents: gridPointerEvents }}
        >
          <div className="gallery-grid">
            {cells.map((cell) =>
              cell.type === 'art' ? (
                <ArtCard
                  key={cell.art.id}
                  art={cell.art}
                  artIndex={cell.artIndex}
                  index={cell.index}
                  totalCells={totalCells}
                  revealProgress={revealRaw}
                  exitProgress={progress}
                  onSelect={setLightboxIndex}
                />
              ) : cell.type === 'viewall' ? (
                <ViewAllCard
                  key="viewall"
                  index={cell.index}
                  totalCells={totalCells}
                  revealProgress={revealRaw}
                  exitProgress={progress}
                />
              ) : (
                <BlankCard
                  key={`blank-${cell.index}`}
                  index={cell.index}
                  totalCells={totalCells}
                  revealProgress={revealRaw}
                  exitProgress={progress}
                />
              )
            )}
          </div>
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
        {/* Empty black background scrolls up behind the fixed Grid and pins */}
      </div>
    </div>
  )
}
