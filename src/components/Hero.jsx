/**
 * Hero.jsx — Landing Section
 *
 * The first viewport. The site-wide fluid gradient (FluidGradient, App.jsx)
 * shows through — Hero is background-transparent. Content:
 *   • A centred "PORTFOLIO 2026" eyebrow (DM Sans — PORTFOLIO extra-light,
 *     2026 bold italic).
 *   • A single flat-white "ANDREW JIANG" wordmark (ElasticHeading, per-letter
 *     mouse-repulsion) sitting flush against the bottom edge and bleeding
 *     full-width past both sides. No parallax — it stays pinned to the bottom.
 * Global navigation lives in SiteHeader (App.jsx), not here.
 *
 * Scroll behaviour: the eyebrow and wordmark fade (the wordmark rises a touch)
 * as Hero exits; the cobalt gradient persists beneath into About.
 */
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import HeroWordmark from './hero/HeroWordmark'

export default function Hero() {
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // Wordmark exit: rise slightly + fade.
  const wordmarkY = useTransform(scrollYProgress, [0, 0.6], [0, -60])
  const wordmarkOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

  // Centred eyebrow exit: drift up + fade (a touch faster than the wordmark).
  const eyebrowY = useTransform(scrollYProgress, [0, 0.5], [0, -40])
  const eyebrowOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0])

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen overflow-hidden"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* Centred PORTFOLIO 2026 eyebrow */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ opacity: eyebrowOpacity, y: eyebrowY }}
      >
        <motion.p
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="font-sans whitespace-nowrap"
          style={{
            color: 'rgba(245,248,255,0.94)',
            fontSize: 'clamp(1rem, 1.5vw, 1.4rem)',
            textShadow: '0 2px 16px rgba(8,12,40,0.35)',
          }}
        >
          <span style={{ fontWeight: 200 }}>PORTFOLIO</span>
          <span style={{ fontWeight: 700, fontStyle: 'italic', marginLeft: '0.35em' }}>2026</span>
        </motion.p>
      </motion.div>

      {/* Full-bleed vector wordmark. The SVG viewBox is tight to the glyphs, so
          width:100% spans edge-to-edge; a small negative bottom (in vw, so it
          scales with the wordmark) seats it slightly past the bottom edge. */}
      <motion.div
        className="absolute inset-x-0"
        style={{ y: wordmarkY, opacity: wordmarkOpacity, bottom: '-1.4vw' }}
      >
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.9, delay: 0.15 }}
        >
          <HeroWordmark
            className="block w-full select-none"
            style={{
              color: '#ffffff',
              filter: 'drop-shadow(0 8px 24px rgba(8,12,40,0.45))',
            }}
          />
        </motion.div>
      </motion.div>
    </section>
  )
}
