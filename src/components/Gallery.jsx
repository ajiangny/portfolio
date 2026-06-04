import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring, useMotionValue, animate } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import { useLenisContext } from '../context/LenisContext'
import GalleryHalftone from './gallery/GalleryHalftone'

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

// ─── Single gallery card ──────────────────────────────────────────
function ArtCard({ art, index, revealProgress, exitProgress, className }) {
  // Entry stagger
  const inStart = 0.65 + index * 0.02
  const inEnd   = inStart + 0.11

  // Exit stagger
  const outStart = 0.80 + index * 0.015
  const outEnd   = outStart + 0.08

  const inOpacity = useTransform(revealProgress, [inStart, inEnd], [0, 1])
  const inRotateX = useTransform(revealProgress, [inStart, inEnd], [-90, 0])

  const outOpacity = useTransform(exitProgress, [outStart, outEnd], [1, 0])
  const outRotateX = useTransform(exitProgress, [outStart, outEnd], [0, 90])

  const opacity = useTransform([inOpacity, outOpacity], ([i, o]) => i * o)
  const rotateX = useTransform([inRotateX, outRotateX], ([i, o]) => i + o)

  const [selected, setSelected] = useState(false)

  return (
    <>
      <motion.div
        style={{ opacity, rotateX, transformOrigin: 'center' }}
        whileHover={{ y: -5 }}
        className={`gallery-card relative w-full h-full overflow-hidden rounded-xl cursor-pointer group ${className || ''}`}
        onClick={() => setSelected(true)}
      >
        <img
          src={art.src}
          alt={art.title}
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          loading="lazy"
        />
        <div className="gallery-overlay absolute inset-0 flex items-end p-5 bg-linear-to-t from-black/60 to-transparent">
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

function ViewAllCard({ index, revealProgress, exitProgress, className }) {
  // Entry stagger
  const inStart = 0.65 + index * 0.02
  const inEnd   = inStart + 0.11

  // Exit stagger
  const outStart = 0.80 + index * 0.015
  const outEnd   = outStart + 0.08

  const inOpacity = useTransform(revealProgress, [inStart, inEnd], [0, 1])
  const inRotateX = useTransform(revealProgress, [inStart, inEnd], [-90, 0])

  const outOpacity = useTransform(exitProgress, [outStart, outEnd], [1, 0])
  const outRotateX = useTransform(exitProgress, [outStart, outEnd], [0, 90])

  const opacity = useTransform([inOpacity, outOpacity], ([i, o]) => i * o)
  const rotateX = useTransform([inRotateX, outRotateX], ([i, o]) => i + o)

  return (
    <motion.div
      style={{ opacity, rotateX, transformOrigin: 'center' }}
      whileHover={{ y: -5 }}
      className={`relative w-full h-full overflow-hidden rounded-xl cursor-pointer group bg-cream/5 border border-cream/10 flex flex-col items-center justify-center ${className || ''}`}
    >
      <div className="absolute inset-0 bg-cobalt/40 opacity-0 group-hover:opacity-100 transition-opacity duration-500 z-0"></div>
      
      <div className="relative z-10 flex flex-col items-center justify-center h-12 overflow-hidden w-full">
        <p className="font-sans text-cream font-bold text-lg uppercase tracking-wide group-hover:-translate-y-10 transition-transform duration-500 absolute">
          View All
        </p>
        <p className="font-mono text-cream/70 text-xs uppercase tracking-widest translate-y-10 group-hover:translate-y-0 transition-transform duration-500 absolute">
          Coming Soon
        </p>
      </div>
      
      {/* Abstract arrow */}
      <div className="absolute right-4 bottom-4 w-8 h-8 rounded-full border border-cream/20 flex items-center justify-center group-hover:bg-cream group-hover:text-cobalt transition-colors duration-500">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12h14"></path>
          <path d="M12 5l7 7-7 7"></path>
        </svg>
      </div>
    </motion.div>
  )
}

// ─────────────────────────────────────────────────────────────────
// Architecture note:
//
// The Projects blue overlay (position:fixed, z-40) covers the screen
// when progress ≈ 0.92–1.0 (scroll = Projects.offsetTop + 184–200vh).
// Gallery only PINS at scroll = Gallery.offsetTop = Projects.offsetTop + 300vh.
// That is a 100vh gap — during which the Projects overlay slides off
// the top while Gallery rises from below.
//
// Fix: the Gallery HEADER is rendered as position:fixed z-50, ABOVE
// the Projects overlay. It fires the moment the blue card fills the
// screen and plays its animation fully independently of scroll.
// The masonry grid stays inside the sticky div as normal.
// ─────────────────────────────────────────────────────────────────
export default function Gallery() {
  const containerRef = useRef(null)
  const lenisRef     = useLenisContext()

  const [activeHeight, setActiveHeight] = useState(0)
  useEffect(() => {
    // 400vh section − 100vh sticky = 300vh of sticky travel
    setActiveHeight(window.innerHeight * 3)
  }, [])

  const rawProgress = useScrollTimeline(containerRef, activeHeight)
  const progress    = useSpring(rawProgress, { stiffness: 240, damping: 30 })

  // ── Scroll gap progress ──────────────────────────────────────────
  // Track scroll through the 100vh gap before Gallery pins.
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

      // Initialise progress on mount
      check({ scroll: lenis.scroll ?? window.scrollY })

      lenis.on('scroll', check)
      return () => lenis.off('scroll', check)
    }, 0)
    return () => clearTimeout(t)
  }, [lenisRef, gapProgressRaw])

  const revealRaw = useTransform(gapProgress, [0.35, 1.0], [0, 1])
  const pulseProgress = useTransform(gapProgress, [0.0, 0.70], [0, 1])

  // ── Combined header opacity: entry (reveal) × exit (progress) ───
  // CSS opacity on a parent element multiplies with child opacity,
  // so nesting these gives exactly entry × exit behaviour.
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

  // ── Big heading: rises from bottom, shrinks from scale 15 → 1 ──
  const headingScale = useTransform(revealRaw, [0.00, 0.30], [15, 1])
  const headingY    = useTransform(revealRaw, [0.00, 0.30], ['100vh', '0vh'])
  const headingO    = useTransform(revealRaw, [0.00, 0.10], [0, 1])

  const bentoClasses = [
    'col-span-2 row-span-2 md:col-span-2 md:row-span-2', // 0
    'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 1
    'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 2
    'col-span-1 row-span-2 md:col-span-1 md:row-span-2', // 3
    'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 4
    'col-span-1 row-span-1 md:col-span-2 md:row-span-1', // 5
    'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 6
    'col-span-1 row-span-1 md:col-span-1 md:row-span-1', // 7
    'col-span-2 row-span-1 md:col-span-2 md:row-span-1', // 8
  ]

  return (
    <div id="gallery" ref={containerRef} style={{ height: '400vh' }}>

      {/* ── Fixed header — z-50 puts it ABOVE the Projects overlay (z-40) ── */}
      {/* It appears on the blue screen the moment the trigger fires,        */}
      {/* completely decoupled from where the Gallery sticky element is.      */}
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
        <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <motion.p
            className="font-sans text-cream/40 text-sm font-semibold tracking-[0.28em] uppercase whitespace-nowrap"
            style={{ y: labelY, opacity: labelO }}
          >
            Gallery
          </motion.p>
        </div>

        {/* Big heading */}
        <div className="absolute top-24 left-0 right-0 flex flex-col items-center text-center pointer-events-none z-20">
          <motion.h2
            className="font-display leading-[0.9] text-cream whitespace-nowrap"
            style={{
              fontSize: 'clamp(56px,7vw,96px)',
              scale: headingScale,
              y: headingY,
              opacity: headingO,
              transformOrigin: 'center top',
            }}
          >
            Recent Works
          </motion.h2>
        </div>

        {/* Bento grid — Fixed to the screen, flips in place */}
        <motion.div 
          className="absolute inset-x-0 bottom-4 md:bottom-8 top-[20vh] md:top-[22vh] flex flex-col items-center justify-start px-4 md:px-6"
          style={{ pointerEvents: gridPointerEvents }}
        >
          <div className="max-w-[95vw] lg:max-w-7xl w-full h-full relative">
            <motion.div 
              className="w-full h-full grid grid-cols-2 md:grid-cols-4 grid-rows-8 md:grid-rows-4 gap-2 md:gap-4"
              style={{ perspective: 1200 }}
            >
              {artworks.slice(0, 9).map((art, index) => (
                <ArtCard 
                  key={art.id} 
                  art={art} 
                  index={index} 
                  revealProgress={revealRaw} 
                  exitProgress={progress}
                  className={bentoClasses[index]} 
                />
              ))}
              
              <ViewAllCard 
                index={9} 
                revealProgress={revealRaw} 
                exitProgress={progress}
                className="col-span-2 row-span-1 md:col-span-1 md:row-span-1" 
              />
            </motion.div>
          </div>
        </motion.div>

      </motion.div>

      {/* ── Sticky pin frame ─────────────────────────────────────────── */}
      <div className="sticky top-0 h-screen overflow-hidden bg-cobalt">
        {/* Empty blue background scrolls up behind the fixed Grid and pins */}
      </div>
    </div>
  )
}
