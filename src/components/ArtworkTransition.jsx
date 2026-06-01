import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform } from 'framer-motion'
import { useLenisContext } from '../App'

// ─── Artwork strips ───────────────────────────────────────────────────────────
const LEFT_COL   = ['/art/art1.webp', '/art/art5.webp', '/art/art6.webp', '/art/art4.webp']
const CENTER_COL = ['/art/art5.webp', '/art/art4.webp', '/art/art1.webp', '/art/profile.jpg']
const RIGHT_COL  = ['/art/art2.webp', '/art/art6.webp', '/art/art4.webp', '/art/art2.webp']

// ─── SVG Gradient Map (duotone) filter ────────────────────────────────────────
// Desaturates the image then maps luminance via feComponentTransfer:
//   luminance 0 (black / shadow) → cobalt  #1B3A8C = rgb(27,  58,  140)
//   luminance 1 (white / highlight) → cream #F5F0E8 = rgb(245, 240, 232)
// Normalised channel values: cobalt → 0.106 / 0.227 / 0.549
//                             cream → 0.961 / 0.941 / 0.910
function DuotoneDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
      <defs>
        <filter id="duotone-art" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="gray" />
          <feComponentTransfer colorInterpolationFilters="sRGB">
            <feFuncR type="table" tableValues="0.106 0.961" />
            <feFuncG type="table" tableValues="0.227 0.941" />
            <feFuncB type="table" tableValues="0.549 0.910" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  )
}

// ─── Halftone dot overlay ─────────────────────────────────────────────────────
// Staggered two-layer grid → circular (honeycomb-style) halftone arrangement.
// Cobalt dots sit on top of the already-duotone image; multiply darkens where
// the dots land (most visible over the cream/highlight areas).
const DOT_BG = {
  backgroundImage: [
    'radial-gradient(circle, rgba(27,58,140,0.65) 38%, transparent 38%)',
    'radial-gradient(circle, rgba(27,58,140,0.65) 38%, transparent 38%)',
  ].join(', '),
  backgroundSize: '7px 7px',
  backgroundPosition: '0 0, 3.5px 3.5px',
  mixBlendMode: 'multiply',
  filter: 'blur(0.5px)',
}

// ─── A single column of artwork cards ────────────────────────────────────────
function ArtColumn({ images, clearLast = false, scale, profileColorOpacity, profileDotsOpacity }) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {images.map((src, i) => {
        const isProfile = clearLast && i === images.length - 1
        const dotsOpacity = isProfile && profileDotsOpacity ? profileDotsOpacity : 1

        return (
          // Outer card — scale lives here, no overflow-hidden so image always fills card
          <motion.div
            key={i}
            className="relative shrink-0"
            style={{
              aspectRatio: '2 / 3',
              width: '100%',
              scale,
              transformOrigin: 'center center',
            }}
          >
            {/* Inner clip keeps image within the card at any scale */}
            <div className="absolute inset-0 overflow-hidden">

              {/* Gradient-mapped (duotone) image — cobalt shadows, cream highlights */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'url(#duotone-art)' }}
              />

              {/* Profile only: full-colour image cross-fades in as the reveal happens.
                  SVG filter URLs can't be smoothly interpolated, so we layer the
                  original image on top and fade it in instead. */}
              {isProfile && (
                <motion.img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: profileColorOpacity }}
                />
              )}

              {/* Halftone dot overlay — fades out on the profile during reveal */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: dotsOpacity, ...DOT_BG, zIndex: 2 }}
              />

            </div>
          </motion.div>
        )
      })}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function ArtworkTransition() {
  const containerRef = useRef(null)
  const lenisRef     = useLenisContext()

  // Lenis-aware scroll progress [0 → 1] through this 300vh section
  const progress = useMotionValue(0)

  useEffect(() => {
    let unlisten = () => {}

    const t = setTimeout(() => {
      const lenis = lenisRef?.current
      if (!lenis) return

      const calc = (scroll) => {
        const el = containerRef.current
        if (!el) return
        const raw = (scroll - el.offsetTop) / (el.offsetHeight - window.innerHeight)
        progress.set(Math.max(0, Math.min(1, raw)))
      }

      const onScroll = ({ scroll }) => calc(scroll)
      calc(lenis.scroll ?? window.scrollY)
      lenis.on('scroll', onScroll)
      unlisten = () => lenis.off('scroll', onScroll)
    }, 0)

    return () => { clearTimeout(t); unlisten() }
  }, [lenisRef, progress])

  // ── Scroll phases ─────────────────────────────────────────────────────────
  // 0.00 → 0.02  — solid blue screen
  // 0.02 → 0.20  — columns roll up from below into view
  // 0.20 → 0.30  — settle: first artwork of each column fully visible
  // 0.30 → 0.75  — film-strip scrolling
  // 0.68 → 0.82  — profile duotone → full colour cross-fade
  // 0.75 → 0.78  — center settles on profile frame
  // 0.78 → 0.93  — side columns exit left/right

  const colsEntryY  = useTransform(progress, [0.02, 0.20], ['100vh', '0vh'])
  const framesScale = useTransform(progress, [0.02, 0.26], [0.60, 1])

  const leftY   = useTransform(progress, [0.30, 0.75], ['0%',   '-55%'])
  const leftX   = useTransform(progress, [0.78, 0.93], ['0%', '-140%'])
  const centerY = useTransform(progress, [0.30, 0.75], ['0%',  '-78%'])
  const rightY  = useTransform(progress, [0.30, 0.75], ['0%',  '-62%'])
  const rightX  = useTransform(progress, [0.78, 0.93], ['0%',  '140%'])

  // Profile reveal — full-colour layer fades in over the duotone base
  const profileColorOpacity = useTransform(progress, [0.68, 0.82], [0, 1])
  const profileDotsOpacity  = useTransform(progress, [0.68, 0.82], [1, 0])

  return (
    <div
      ref={containerRef}
      style={{ height: '300vh', background: 'var(--color-cobalt)' }}
    >
      {/* Gradient-map SVG filter definition (hidden, referenced by CSS filter URL) */}
      <DuotoneDefs />

      {/* Sticky viewport — overflow:hidden clips the off-screen columns */}
      <div className="sticky top-0 overflow-hidden" style={{ height: '100vh' }}>

        {/* ── 3 art columns ──────────────────────────────────────────────── */}
        <motion.div
          className="absolute inset-0 grid grid-cols-3 gap-4 px-8"
          style={{ paddingTop: '5vh', paddingBottom: '5vh', overflow: 'hidden', y: colsEntryY }}
        >
          {/* Left — scrolls UP then exits LEFT */}
          <motion.div style={{ y: leftY, x: leftX }}>
            <ArtColumn images={LEFT_COL} scale={framesScale} />
          </motion.div>

          {/* Center — scrolls DOWN, settling profile frame in viewport */}
          <motion.div style={{ y: centerY }}>
            <ArtColumn
              images={CENTER_COL}
              clearLast
              scale={framesScale}
              profileColorOpacity={profileColorOpacity}
              profileDotsOpacity={profileDotsOpacity}
            />
          </motion.div>

          {/* Right — scrolls UP then exits RIGHT */}
          <motion.div style={{ y: rightY, x: rightX }}>
            <ArtColumn images={RIGHT_COL} scale={framesScale} />
          </motion.div>
        </motion.div>

      </div>
    </div>
  )
}
