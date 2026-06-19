/**
 * Hero.jsx — Landing Section
 *
 * The first viewport. The site-wide fluid gradient (FluidGradient, App.jsx)
 * shows through — Hero is background-transparent. Content is a single
 * full-bleed "ANDREW JIANG" wordmark (flat white) pinned to the bottom edge,
 * with per-letter mouse-repulsion physics (ElasticHeading). Global navigation
 * lives in SiteHeader (App.jsx), not here.
 *
 * Scroll behaviour: the wordmark rises slightly and fades as Hero exits;
 * the cobalt gradient persists beneath into About.
 */
import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion'
import ElasticHeading from './hero/ElasticHeading'

// Flat white per-letter fill (replaces the old liquid-glass gradient clip).
const WORDMARK_STYLE = { color: '#ffffff' }

export default function Hero() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Wordmark exit: rise slightly + fade.
  const wordmarkY = useTransform(scrollYProgress, [0, 0.6], [0, -60])
  const wordmarkOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Subtle mouse parallax.
  const heroMouseX = useMotionValue(0)
  const heroMouseY = useMotionValue(0)
  const smoothMouseX = useSpring(heroMouseX, { stiffness: 120, damping: 18 })
  const smoothMouseY = useSpring(heroMouseY, { stiffness: 120, damping: 18 })
  const parallaxX = useTransform(smoothMouseX, (x) => x * -0.025)
  const parallaxY = useTransform(smoothMouseY, (y) => y * -0.025)

  const trackMouse = (e) => {
    const r = e.currentTarget.getBoundingClientRect()
    heroMouseX.set(e.clientX - r.left - r.width / 2)
    heroMouseY.set(e.clientY - r.top - r.height / 2)
  }
  const resetMouse = () => { heroMouseX.set(0); heroMouseY.set(0) }

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: 'transparent' }}
      onMouseMove={trackMouse}
      onMouseLeave={resetMouse}
    >
      {/* Full-bleed wordmark pinned to the bottom edge. The fixed font size is
          intentionally wider than the viewport so "ANDREW JIANG" bleeds past
          both edges (clipped by overflow-hidden / App's overflow-x-clip). */}
      <motion.div
        className="absolute inset-x-0 bottom-0 flex justify-center"
        style={{ y: wordmarkY, opacity: wordmarkOpacity }}
      >
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ x: parallaxX, y: parallaxY }}
        >
          <ElasticHeading
            text="Andrew Jiang"
            ariaLabel="Andrew Jiang — Portfolio. Developer and designer."
            className="font-display leading-none select-none uppercase"
            letterStyle={WORDMARK_STYLE}
            style={{
              fontSize: 'clamp(4rem, 19vw, 17rem)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              filter: 'drop-shadow(0 8px 24px rgba(8,12,40,0.45))',
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
