import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'

// ─── Artwork data ─────────────────────────────────────────────────
const baseArtworks = [
  { id: 1, title: 'Cosmic Nebula',    medium: 'Digital Art',          src: '/art/art1.png', aspect: 'portrait'  },
  { id: 2, title: 'Crystal Geometry', medium: 'Digital Illustration', src: '/art/art2.png', aspect: 'landscape' },
  { id: 3, title: 'Portrait Study',   medium: 'Digital Painting',     src: '/art/art3.png', aspect: 'portrait'  },
  { id: 4, title: 'Floating Worlds',  medium: 'Concept Art',          src: '/art/art4.png', aspect: 'landscape' },
]

const artworks = [
  ...baseArtworks,
  { id: 5, title: 'Neon Nights',      medium: 'Photography',    src: '/art/art1.png', aspect: 'landscape' },
  { id: 6, title: 'Abstract Forms',   medium: '3D Render',      src: '/art/art2.png', aspect: 'portrait'  },
  { id: 7, title: 'Cyber City',       medium: 'Concept Art',    src: '/art/art3.png', aspect: 'landscape' },
  { id: 8, title: 'Character Sketch', medium: 'Pencil',         src: '/art/art4.png', aspect: 'portrait'  },
  { id: 9, title: 'Mountain Vista',   medium: 'Matte Painting', src: '/art/art1.png', aspect: 'landscape' },
]

// ─── Single gallery card with staggered scroll-fade reveal ───────
function ArtCard({ art, index, revealProgress }) {
  const start = 0.28 + index * 0.035
  const end   = start + 0.12

  const opacity    = useTransform(revealProgress, [start, end], [0, 1])
  const translateY = useTransform(revealProgress, [start, end], [48, 0])

  const [selected, setSelected] = useState(false)

  return (
    <>
      <motion.div
        style={{ opacity, y: translateY }}
        className="gallery-card relative w-full overflow-hidden rounded-xl cursor-pointer"
        onClick={() => setSelected(true)}
      >
        <div
          style={{ aspectRatio: art.aspect === 'portrait' ? '3/4' : '4/3' }}
          className="w-full"
        >
          <img
            src={art.src}
            alt={art.title}
            className="w-full h-full object-cover transition-transform duration-700 hover:scale-105"
            loading="lazy"
          />
        </div>
        <div className="gallery-overlay absolute inset-0 flex items-end p-5">
          <div>
            <p className="font-sans text-cream font-bold text-sm uppercase tracking-wide">
              {art.title}
            </p>
            <p className="font-mono text-cream/70 text-[10px] mt-0.5 uppercase tracking-wider">
              {art.medium}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Lightbox */}
      {selected && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={art.title}
          onClick={() => setSelected(false)}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={art.src} alt={art.title} className="w-full border-2 border-cream/20" />
            <div className="mt-4 flex items-center justify-between px-1">
              <div>
                <p className="font-sans text-cream font-bold text-lg uppercase tracking-wide">
                  {art.title}
                </p>
                <p className="font-mono text-cream/60 text-xs uppercase tracking-wider">
                  {art.medium}
                </p>
              </div>
              <button
                id={`lightbox-close-${art.id}`}
                onClick={() => setSelected(false)}
                className="text-cream/60 hover:text-cream transition-colors font-mono text-xs uppercase tracking-widest flex items-center gap-2 cursor-pointer"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

//
// Projects section (300vh, sticky travel = 200vh) ends with the primary
// project card expanding to fill the screen with solid cobalt blue.
// As Projects unpins and scrolls out, GalleryTransition enters from below.
// GalleryTransition is also solid cobalt blue, so the visual handoff
// is entirely seamless.
//
// Once GalleryTransition pins (rawProgress = 0), the gallery elements
// smoothly animate in over the blue background.
//
// activeHeight = 300vh (sticky travel = sectionHeight - viewportHeight)
// ─────────────────────────────────────────────────────────────────
export default function Gallery() {
  const containerRef = useRef(null)

  const [activeHeight, setActiveHeight] = useState(0)
  useEffect(() => {
    // 400vh section − 100vh sticky = 300vh sticky travel.
    setActiveHeight(window.innerHeight * 3)
  }, [])

  const rawProgress = useScrollTimeline(containerRef, activeHeight)
  const progress    = useSpring(rawProgress, { stiffness: 240, damping: 30 })

  // ── Gallery content (0.05+) ───────────────────────────────────────
  const galleryOpacity = useTransform(progress, [0.05, 0.15], [0, 1])
  const headerOpacity  = useTransform(progress, [0.10, 0.20], [0, 1])
  const headerYVal     = useTransform(progress, [0.10, 0.20], [36, 0])

  // ── Masonry parallax ─────────────────────────────────────────────
  const col1Y = useTransform(progress, [0.10, 1], ['0vh',  '-38vh'])
  const col2Y = useTransform(progress, [0.10, 1], ['10vh', '-58vh'])
  const col3Y = useTransform(progress, [0.10, 1], ['-6vh', '-30vh'])

  // Distribute artworks across 3 columns
  const col1 = [], col2 = [], col3 = []
  artworks.forEach((art, i) => {
    if      (i % 3 === 0) col1.push({ art, index: i })
    else if (i % 3 === 1) col2.push({ art, index: i })
    else                  col3.push({ art, index: i })
  })

  return (
    <div
      id="gallery"
      ref={containerRef}
      style={{ height: '400vh' }}
    >
      {/* ── Sticky pin frame ─────────────────────────────────────── */}
      <div className="sticky top-0 h-screen overflow-hidden bg-cobalt">

        {/* ── GALLERY CONTENT ──────────────────────────────────────── */}
        <motion.div
          style={{ opacity: galleryOpacity, zIndex: 30 }}
          className="absolute inset-0 bg-cobalt overflow-hidden flex flex-col px-6"
        >
          {/* Section Label */}
          <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20">
            <motion.p 
              className="font-sans text-cream/40 text-sm font-semibold tracking-[0.28em] uppercase whitespace-nowrap"
              style={{ opacity: headerOpacity, y: headerYVal }}
            >
              Gallery
            </motion.p>
          </div>

          {/* Header */}
          <motion.div
            style={{ opacity: headerOpacity, y: headerYVal }}
            className="absolute top-24 left-0 right-0 z-10 flex flex-col items-center text-center pointer-events-none"
          >
            <h2 className="font-display text-[clamp(56px,7vw,96px)] leading-[0.95] text-cream">Gallery</h2>
            <p className="font-mono text-cream/40 text-sm mt-3 max-w-sm leading-[1.9]">
              A collection of digital artworks — click any piece to view it full size.
            </p>
          </motion.div>

          {/* Masonry grid */}
          <div className="max-w-6xl mx-auto w-full h-full relative">
            <div className="absolute inset-0 pt-56 pb-16 grid grid-cols-1 md:grid-cols-3 gap-6">

              <motion.div className="flex flex-col gap-6 w-full" style={{ y: col1Y }}>
                {col1.map(({ art, index }) => (
                  <ArtCard key={art.id} art={art} index={index} revealProgress={progress} />
                ))}
              </motion.div>

              <motion.div className="hidden md:flex flex-col gap-6 w-full" style={{ y: col2Y }}>
                {col2.map(({ art, index }) => (
                  <ArtCard key={art.id} art={art} index={index} revealProgress={progress} />
                ))}
              </motion.div>

              <motion.div className="hidden md:flex flex-col gap-6 w-full" style={{ y: col3Y }}>
                {col3.map(({ art, index }) => (
                  <ArtCard key={art.id} art={art} index={index} revealProgress={progress} />
                ))}
              </motion.div>

            </div>
          </div>
        </motion.div>

      </div>
    </div>
  )
}
