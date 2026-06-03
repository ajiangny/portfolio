import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'

// We expand the placeholder data to fill out a nice masonry grid
const baseArtworks = [
  { id: 1, title: 'Cosmic Nebula',    medium: 'Digital Art',          src: '/art/art1.png', aspect: 'portrait' },
  { id: 2, title: 'Crystal Geometry', medium: 'Digital Illustration', src: '/art/art2.png', aspect: 'landscape' },
  { id: 3, title: 'Portrait Study',   medium: 'Digital Painting',     src: '/art/art3.png', aspect: 'portrait' },
  { id: 4, title: 'Floating Worlds',  medium: 'Concept Art',          src: '/art/art4.png', aspect: 'landscape' },
]

const artworks = [
  ...baseArtworks,
  { id: 5, title: 'Neon Nights',      medium: 'Photography',          src: '/art/art1.png', aspect: 'landscape' },
  { id: 6, title: 'Abstract Forms',   medium: '3D Render',            src: '/art/art2.png', aspect: 'portrait' },
  { id: 7, title: 'Cyber City',       medium: 'Concept Art',          src: '/art/art3.png', aspect: 'landscape' },
  { id: 8, title: 'Character Sketch', medium: 'Pencil',               src: '/art/art4.png', aspect: 'portrait' },
  { id: 9, title: 'Mountain Vista',   medium: 'Matte Painting',       src: '/art/art1.png', aspect: 'landscape' },
]

export default function ArtGallery() {
  const [selected, setSelected] = useState(null)
  const close = () => setSelected(null)

  const containerRef = useRef(null)
  
  const [activeHeight, setActiveHeight] = useState(0)
  useEffect(() => {
    setActiveHeight(window.innerHeight * 2.5)
  }, [])
  
  const rawProgress = useScrollTimeline(containerRef, activeHeight)
  const progress = useSpring(rawProgress, { stiffness: 300, damping: 30 })

  // Fade out header
  const headerOpacity = useTransform(progress, [0, 0.15], [1, 0])
  const headerY = useTransform(progress, [0, 0.15], [0, -50])

  // Parallax translation for columns
  // Middle column moves fastest, outer columns move slower
  const col1Y = useTransform(progress, [0, 1], ['20vh', '-50vh'])
  const col2Y = useTransform(progress, [0, 1], ['40vh', '-90vh'])
  const col3Y = useTransform(progress, [0, 1], ['10vh', '-40vh'])

  // Distribute artworks into 3 columns
  const col1 = [], col2 = [], col3 = []
  artworks.forEach((art, i) => {
    if (i % 3 === 0) col1.push(art)
    else if (i % 3 === 1) col2.push(art)
    else col3.push(art)
  })

  const renderColumn = (colData, yTransform, colIndex) => (
    <motion.div 
      className="flex flex-col gap-6 w-full"
      style={{ y: yTransform }}
    >
      {colData.map((art) => (
        <div
          key={art.id}
          className="gallery-card relative w-full overflow-hidden rounded-xl bg-ink/5"
          style={{
            // Give placeholders some distinct aspect ratios for masonry effect
            aspectRatio: art.aspect === 'portrait' ? '3/4' : '4/3'
          }}
          onClick={() => setSelected(art)}
        >
          <img
            src={art.src}
            alt={art.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
          />
          <div className="gallery-overlay absolute inset-0 bg-linear-to-t from-cobalt/90 via-cobalt/20 to-transparent opacity-0 transition-opacity duration-300 flex items-end p-6 hover:opacity-100">
            <div>
              <p className="font-sans text-cream font-bold text-sm uppercase tracking-wide">{art.title}</p>
              <p className="font-mono text-cream/70 text-[10px] mt-0.5 uppercase tracking-wider">{art.medium}</p>
            </div>
          </div>
        </div>
      ))}
    </motion.div>
  )

  return (
    <div
      id="gallery"
      ref={containerRef}
      className="border-t-2 border-ink bg-cream"
      style={{ height: '350vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center px-6">
        
        {/* Header - Stays centered, fades out on scroll */}
        <motion.div 
          className="absolute top-24 left-0 right-0 z-10 flex flex-col items-center text-center pointer-events-none"
          style={{ opacity: headerOpacity, y: headerY }}
        >
          <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase mb-2">
            // 03 — Creative Work
          </p>
          <h2 className="font-display text-5xl md:text-7xl text-ink">
            Gallery
          </h2>
          <p className="font-mono text-text-light text-xs mt-3 max-w-md leading-[1.8]">
            A collection of digital artworks — click any piece to view it full size.
          </p>
        </motion.div>

        {/* Masonry Parallax Grid */}
        <div className="max-w-6xl mx-auto w-full h-full relative pointer-events-none">
          <div className="absolute inset-0 pt-64 pb-24 grid grid-cols-1 md:grid-cols-3 gap-6 pointer-events-auto">
            {renderColumn(col1, col1Y, 1)}
            <div className="hidden md:flex">
              {renderColumn(col2, col2Y, 2)}
            </div>
            <div className="hidden md:flex">
              {renderColumn(col3, col3Y, 3)}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onClick={close}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selected.src}
              alt={selected.title}
              className="w-full border-2 border-cream/20"
            />
            <div className="mt-4 flex items-center justify-between px-1">
              <div>
                <p className="font-sans text-cream font-bold text-lg uppercase tracking-wide">{selected.title}</p>
                <p className="font-mono text-cream/60 text-xs uppercase tracking-wider">{selected.medium}</p>
              </div>
              <button
                id="lightbox-close"
                onClick={close}
                className="text-cream/60 hover:text-cream transition-colors font-mono text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
