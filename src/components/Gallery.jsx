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
 *   • GalleryHalftone — cream dot canvas with a radial pulse ring
 *     that expands as the section scrolls into view
 *
 * Grid cells beyond the artwork count are filled with blank placeholders
 * to maintain the grid structure.
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, useTransform, useSpring, useMotionValue, AnimatePresence } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import { useLenisContext } from '../context/LenisContext'
import GalleryHalftone from './gallery/GalleryHalftone'
import SectionNav from './SectionNav'
import { artworks } from '../data/galleryData'


// 9 columns × 3 rows = 27 cells. Fill remaining with blanks.
const TOTAL_CELLS = 27

// ─── Single gallery card ──────────────────────────────────────────
function ArtCard({ art, index, revealProgress, exitProgress, onSelect }) {
  const inStart = 0.55 + index * 0.025
  const inEnd = inStart + 0.14

  const outStart = 0.80 + index * 0.012
  const outEnd = outStart + 0.08

  const inOpacity = useTransform(revealProgress, [inStart, inEnd], [0, 1])
  const inScale = useTransform(revealProgress, [inStart, inEnd], [0.85, 1])

  const outOpacity = useTransform(exitProgress, [outStart, outEnd], [1, 0])
  const outScale = useTransform(exitProgress, [outStart, outEnd], [1, 0.9])

  const opacity = useTransform([inOpacity, outOpacity], ([i, o]) => i * o)
  const scale = useTransform([inScale, outScale], ([i, o]) => i * o)

  return (
    <motion.div
      style={{ opacity, scale }}
      className="gallery-cell gallery-cell-art group"
      onClick={() => onSelect(index)}
    >
      <img
        src={art.src}
        alt={art.title || art.medium}
        className="gallery-cell-img"
        loading="lazy"
      />
      {/* Hover overlay */}
      <div className="gallery-cell-overlay">
        <span className="font-mono text-cream/90 text-[9px] md:text-[11px] uppercase tracking-[0.2em]">
          {art.medium}
        </span>
      </div>
    </motion.div>
  )
}

// ─── Blank placeholder cell ───────────────────────────────────────
function BlankCard({ index, revealProgress, exitProgress }) {
  const inStart = 0.55 + index * 0.025
  const inEnd = inStart + 0.14

  const outStart = 0.80 + index * 0.012
  const outEnd = outStart + 0.08

  const inOpacity = useTransform(revealProgress, [inStart, inEnd], [0, 1])
  const inScale = useTransform(revealProgress, [inStart, inEnd], [0.85, 1])

  const outOpacity = useTransform(exitProgress, [outStart, outEnd], [1, 0])
  const outScale = useTransform(exitProgress, [outStart, outEnd], [1, 0.9])

  const opacity = useTransform([inOpacity, outOpacity], ([i, o]) => i * o)
  const scale = useTransform([inScale, outScale], ([i, o]) => i * o)

  return (
    <motion.div
      style={{ opacity, scale }}
      className="gallery-cell gallery-cell-blank"
    />
  )
}

// ─── Lightbox with carousel ───────────────────────────────────────
function GalleryLightbox({ artworks, initialIndex, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const current = artworks[currentIndex]
  const carouselRef = useRef(null)

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') setCurrentIndex((p) => (p - 1 + artworks.length) % artworks.length)
      if (e.key === 'ArrowRight') setCurrentIndex((p) => (p + 1) % artworks.length)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose, artworks.length])

  // Scroll active thumbnail into view
  useEffect(() => {
    if (carouselRef.current) {
      const thumb = carouselRef.current.children[currentIndex]
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentIndex])

  const goNext = useCallback(() => {
    setCurrentIndex((p) => (p + 1) % artworks.length)
  }, [artworks.length])

  const goPrev = useCallback(() => {
    setCurrentIndex((p) => (p - 1 + artworks.length) % artworks.length)
  }, [artworks.length])

  return (
    <motion.div
      className="gallery-lightbox-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={current.title || current.medium}
    >
      <div
        className="gallery-lightbox-container"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close button */}
        <button
          className="gallery-lightbox-close"
          onClick={onClose}
          aria-label="Close lightbox"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <path d="M18 6L6 18" />
            <path d="M6 6l12 12" />
          </svg>
        </button>

        {/* Main image area */}
        <div className="gallery-lightbox-main">
          {/* Left arrow */}
          <button className="gallery-lightbox-arrow gallery-lightbox-arrow-left" onClick={goPrev} aria-label="Previous artwork">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          {/* Image with AnimatePresence for crossfade */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIndex}
              className="gallery-lightbox-image-wrapper"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: 'easeOut' }}
            >
              <img
                src={current.src}
                alt={current.title || current.medium}
                className="gallery-lightbox-image"
              />
            </motion.div>
          </AnimatePresence>

          {/* Right arrow */}
          <button className="gallery-lightbox-arrow gallery-lightbox-arrow-right" onClick={goNext} aria-label="Next artwork">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>
        </div>

        {/* Info bar */}
        <div className="gallery-lightbox-info">
          <div>
            {current.title && (
              <p className="font-sans text-cream font-semibold text-sm md:text-base tracking-wide">
                {current.title}
              </p>
            )}
            <p className="font-mono text-cream/50 text-[10px] md:text-xs uppercase tracking-[0.15em]">
              {current.medium}
            </p>
          </div>
          <p className="font-mono text-cream/30 text-[10px] tracking-wider">
            {currentIndex + 1} / {artworks.length}
          </p>
        </div>

        {/* Thumbnail carousel */}
        <div className="gallery-lightbox-carousel-wrapper">
          <div
            ref={carouselRef}
            className="gallery-lightbox-carousel"
          >
            {artworks.map((art, idx) => (
              <button
                key={art.id}
                className={`gallery-lightbox-thumb ${idx === currentIndex ? 'active' : ''}`}
                onClick={() => setCurrentIndex(idx)}
                aria-label={`View artwork ${idx + 1}`}
              >
                <img
                  src={art.src}
                  alt={art.title || art.medium}
                  className="gallery-lightbox-thumb-img"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────
export default function Gallery() {
  const containerRef = useRef(null)
  const lenisRef = useLenisContext()

  const [activeHeight, setActiveHeight] = useState(0)
  useEffect(() => {
    setActiveHeight(window.innerHeight * 3)
  }, [])

  const rawProgress = useScrollTimeline(containerRef, activeHeight)
  const progress = useSpring(rawProgress, { stiffness: 240, damping: 30 })

  // ── Scroll gap progress ──────────────────────────────────────────
  const gapProgressRaw = useMotionValue(0)
  const gapProgress = useSpring(gapProgressRaw, { stiffness: 300, damping: 40 })

  useEffect(() => {
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
      return () => lenis.off('scroll', check)
    }, 0)
    return () => clearTimeout(t)
  }, [lenisRef, gapProgressRaw])

  const revealRaw = useTransform(gapProgress, [0.35, 1.0], [0, 1])
  const pulseProgress = useTransform(gapProgress, [0.0, 0.70], [0, 1])

  // ── Combined header opacity: entry × exit ───────────────────────
  const headerExitO = useTransform(progress, [0.82, 1.0], [1, 0])
  const headerEntryO = useTransform(gapProgress, [0, 0.05], [0, 1])
  const headerOpacity = useTransform([headerEntryO, headerExitO], ([inO, outO]) => inO * outO)
  const gridPointerEvents = useTransform(
    [revealRaw, progress],
    ([r, p]) => (r > 0.6 && p < 0.85) ? 'auto' : 'none'
  )

  // ── Small label: slides down from above ──────────────────────────
  const labelY = useTransform(revealRaw, [0.00, 0.10], ['-60px', '0px'])
  const labelO = useTransform(revealRaw, [0.00, 0.10], [0, 1])

  // ── Lightbox state ──────────────────────────────────────────────
  const [lightboxIndex, setLightboxIndex] = useState(null)

  // Build the 15-cell grid: 9 artworks + 6 blanks
  const cells = []
  for (let i = 0; i < TOTAL_CELLS; i++) {
    if (i < artworks.length) {
      cells.push({ type: 'art', art: artworks[i], index: i })
    } else {
      cells.push({ type: 'blank', index: i })
    }
  }

  return (
    <div id="gallery" ref={containerRef} style={{ height: '400vh' }}>

      {/* ── Fixed header — z-50 puts it ABOVE the Projects overlay (z-40) ── */}
      <motion.div
        style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          zIndex: 50,
          pointerEvents: 'none',
          opacity: headerOpacity,
        }}
      >
        {/* Halftone pulse and background */}
        <GalleryHalftone pulseProgress={pulseProgress} headerOpacity={headerOpacity} />

        {/* Small label */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-20">
          <SectionNav
            currentSection="Gallery"
            style={{ y: labelY, opacity: labelO }}
            defaultTextColor="rgba(245,240,232,0.4)"
          />
        </div>

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
                  index={cell.index}
                  revealProgress={revealRaw}
                  exitProgress={progress}
                  onSelect={setLightboxIndex}
                />
              ) : (
                <BlankCard
                  key={`blank-${cell.index}`}
                  index={cell.index}
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
      <div className="sticky top-0 h-screen overflow-hidden bg-black">
        {/* Empty black background scrolls up behind the fixed Grid and pins */}
      </div>
    </div>
  )
}
