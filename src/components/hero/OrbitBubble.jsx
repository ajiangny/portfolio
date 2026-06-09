/**
 * OrbitBubble.jsx — Orbiting Navigation Bubble
 *
 * A single floating nav link that orbits the Hero heading in an elliptical
 * path. On hover, the active bubble scales up while siblings shrink.
 * On scroll, all bubbles explode outward and fade to make room for
 * the About section entrance.
 *
 * Each bubble has:
 *   • Continuous orbital motion (useAnimationFrame)
 *   • Mouse parallax layered on top of the orbit
 *   • Scroll-driven outward expansion and fade
 *   • Organic blob border-radius shapes
 */
import { useRef } from 'react'
import { motion, useAnimationFrame } from 'framer-motion'
import { ORBIT_DURATION} from './orbitConstants'


const NAV_LENGTH = 4 // kept in sync with navLinks in Hero

const BLOB_ACTIVE = '54% 46% 58% 42% / 50% 52% 48% 50%'
const SHRINK_SCALES = [0.88, 0.44, 0.25]

export default function OrbitBubble({
  label, href, angleOffset, onNavigate,
  myIdx, hoveredIdx, onHoverChange, blobShape,
  smoothMouseX, smoothMouseY, parallaxStrength,
  orbitPausedRef,
  scrollYProgress,   // MotionValue [0–1]: drives scroll-exit
}) {
  const posRef   = useRef(null)
  const angleRef = useRef(angleOffset)
  const lastTRef = useRef(null)

  const isHovered = hoveredIdx === myIdx
  const isShrunk  = hoveredIdx !== null && hoveredIdx !== myIdx

  useAnimationFrame((t) => {
    if (lastTRef.current !== null && !orbitPausedRef.current) {
      const dt = t - lastTRef.current
      angleRef.current += (dt / ORBIT_DURATION) * Math.PI * 2
    }
    lastTRef.current = t

    const scroll = scrollYProgress ? scrollYProgress.get() : 0

    const rx = window.innerWidth  * 0.39
    const ry = Math.min(window.innerHeight * 0.26, 220)

    // Push radius outward as user scrolls — bubbles explode away from centre
    const outward = 1 + scroll * 3.5
    const ox = Math.cos(angleRef.current) * rx * outward
    const oy = Math.sin(angleRef.current) * ry * outward

    const px = smoothMouseX.get() * parallaxStrength
    const py = smoothMouseY.get() * parallaxStrength

    if (posRef.current) {
      posRef.current.style.left    = `calc(50% + ${ox + px}px)`
      posRef.current.style.top     = `calc(50% + ${oy + py}px)`
      // Fade out: fully gone by scroll = 0.4
      posRef.current.style.opacity = String(Math.max(0, 1 - scroll / 0.4))
    }
  })

  const siblingRank = isShrunk
    ? (myIdx - (hoveredIdx ?? 0) + NAV_LENGTH) % NAV_LENGTH - 1
    : -1
  const shrunkScale = isShrunk ? (SHRINK_SCALES[siblingRank] ?? 0.60) : 1

  return (
    <a
      ref={posRef}
      href={href}
      onClick={(e) => { e.preventDefault(); onNavigate(href, e, myIdx) }}
      className="absolute"
      style={{ transform: 'translate(-50%, -50%)' }}
      aria-label={`Go to ${label}`}
    >
      <motion.span
        onHoverStart={() => { orbitPausedRef.current = true;  onHoverChange(myIdx) }}
        onHoverEnd={()   => { orbitPausedRef.current = false; onHoverChange(null)  }}

        animate={{
          borderRadius: isHovered ? BLOB_ACTIVE : blobShape,
          scale:   isHovered ? 2.25 : shrunkScale,
          opacity: 1,
          backgroundColor: 'var(--color-cobalt)',
          boxShadow: isHovered
            ? '0 16px 44px rgba(var(--color-cobalt-rgb), 0.65)'
            : isShrunk
            ? '0 2px 10px rgba(var(--color-cobalt-rgb), 0.2)'
            : '0 4px 18px rgba(var(--color-cobalt-rgb), 0.28)',
        }}
        transition={{ type: 'spring', stiffness: 500, damping: 28 }}

        className="flex items-center justify-center gap-1.5 font-sans font-bold uppercase tracking-[0.18em] whitespace-nowrap select-none cursor-pointer"
        style={{
          color: 'var(--color-cobalt-text, var(--color-cream))',
          fontSize: '0.65rem',
          padding: '0.625rem 1.25rem',
          borderRadius: blobShape,
          overflow: 'visible',
        }}
      >
        <motion.span
          animate={{ opacity: isShrunk ? 0 : 1 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="flex items-center gap-1.5"
          style={{ pointerEvents: 'none' }}
        >
          <span className="rounded-full bg-cream/40 shrink-0" style={{ width: '4px', height: '4px' }} />
          {label}
        </motion.span>
      </motion.span>
    </a>
  )
}
