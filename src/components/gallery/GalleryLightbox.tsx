/**
 * GalleryLightbox.tsx — Fullscreen Artwork Viewer
 *
 * Modal lightbox opened by clicking a Gallery grid cell. Features:
 *   • Crossfading main image (AnimatePresence)
 *   • Prev/next arrows + ArrowLeft/ArrowRight/Escape keyboard navigation
 *   • Thumbnail carousel strip with auto scroll-into-view
 *   • Focus moves to the close button on open and restores on close
 *
 * Styles live in index.css under the `.gallery-lightbox-*` classes.
 * The caller is responsible for pausing page scroll while open
 * (Gallery stops Lenis when lightboxIndex !== null).
 */
import { useRef, useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Artwork } from '../../data/galleryData'

export interface GalleryLightboxProps {
  artworks: Artwork[]
  initialIndex: number
  onClose: () => void
}

export default function GalleryLightbox({ artworks, initialIndex, onClose }: GalleryLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const current = artworks[currentIndex]
  const carouselRef = useRef<HTMLDivElement | null>(null)
  const closeButtonRef = useRef<HTMLButtonElement | null>(null)

  // Move focus into the dialog on open, restore it on close
  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null
    closeButtonRef.current?.focus()
    return () => previouslyFocused?.focus?.()
  }, [])

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
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
          ref={closeButtonRef}
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
            <p className="font-mono text-cream/50 text-meta uppercase tracking-[0.15em]">
              {current.medium}
            </p>
          </div>
          <p className="font-mono text-cream/30 text-meta tracking-wider">
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
