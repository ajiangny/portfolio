/**
 * Hero.jsx — Landing Section
 *
 * The first viewport. The site-wide fluid gradient (FluidGradient, App.jsx)
 * shows through — Hero is background-transparent. Content:
 *   • A centred "PORTFOLIO 2026" eyebrow (DM Sans — PORTFOLIO extra-light,
 *     2026 bold italic).
 *   • A single "ANDREW JIANG" wordmark (HeroWordmark, per-letter mouse-repulsion)
 *     sitting flush against the bottom edge, full-width. Stays white throughout;
 *     per-glyph hover shadows live inside HeroWordmark itself.
 *   • As the Hero exits, the About section's white entry panel peeks into the
 *     bottom of the viewport from below — no animated panel in Hero.
 * Global navigation lives in SiteHeader (App.jsx), not here.
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

  // Eyebrow exits: drift up + fade.
  const eyebrowY = useTransform(scrollYProgress, [0, 0.5], [0, -40])
  const eyebrowOpacity = useTransform(scrollYProgress, [0, 0.35], [1, 0])

  // Wordmark fades out late — stays white throughout, no colour transition.
  const wordmarkOpacity = useTransform(scrollYProgress, [0.84, 0.95], [1, 0])

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative overflow-hidden"
      style={{ minHeight: 'calc(100vh + 2px)', backgroundColor: 'transparent' }}
    >
      {/* Centred PORTFOLIO 2026 eyebrow */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ opacity: eyebrowOpacity, y: eyebrowY, zIndex: 2 }}
      >
        <motion.p
          initial={{ clipPath: 'inset(100% 0 0 0)' }}
          animate={{ clipPath: 'inset(0% 0 0 0)' }}
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

      {/* Full-bleed wordmark — white, no scroll-driven colour or shadow.
          Per-glyph hover shadows are handled inside HeroWordmark. */}
      <motion.div
        className="absolute inset-x-0"
        style={{ bottom: '-0.5vw', opacity: wordmarkOpacity, zIndex: 2 }}
      >
        <motion.div
          initial={{ y: 300 }} // Hiding initially
          animate={{ y: 0 }}
          transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{ color: '#ffffff' }}
        >
          <HeroWordmark className="block w-full select-none" />
        </motion.div>
      </motion.div>
    </section>
  )
}
