/**
 * Hero.tsx — Landing Section (riot style)
 *
 * The first viewport. The site-wide fluid background (FluidGradient, App.tsx)
 * shows through — Hero is background-transparent. Layers, back to front:
 *   • A halftone band and a huge outlined "26" stamp cropped off the top
 *     right (flat layers that parallax at different rates on scroll).
 *   • An ink slash across the bottom that the wordmark sits on.
 *   • A centred "PORTFOLIO 2026" eyebrow on the tilted axis: a cream slab
 *     tag with the year ransomed onto an ink chip, plus a role line.
 *   • The "ANDREW JIANG" wordmark (HeroWordmark, per-letter mouse-repulsion,
 *     hard cobalt offset shadows) flush against the bottom edge.
 * Global navigation lives in SiteHeader (App.tsx), not here.
 */
import { useRef } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import InkReveal from './InkDissolve'
import HeroWordmark from './hero/HeroWordmark'
import { RIOT, TILT, jagged, jaggedPx } from '../style/riot'

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

  // Flat background layers slide at different rates as you scroll (parallax
  // between flat planes is the riot stand-in for lighting/depth).
  const bandX = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])
  const stampX = useTransform(scrollYProgress, [0, 1], ['0%', '14%'])

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative overflow-hidden"
      style={{ minHeight: 'calc(100vh + 2px)', backgroundColor: 'transparent' }}
    >
      {/* ── Back layers (riot rule 6): halftone band, outlined stamp, ink slash ── */}
      <div
        aria-hidden
        className="halftone absolute pointer-events-none"
        style={{
          inset: '-20%',
          rotate: `${TILT}deg`,
          color: 'rgba(255,255,255,0.13)',
          maskImage: 'linear-gradient(180deg, transparent 22%, #000 32%, #000 44%, transparent 54%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 22%, #000 32%, #000 44%, transparent 54%)',
          zIndex: 0,
        }}
      />
      <motion.div
        aria-hidden
        className="font-sans absolute pointer-events-none select-none"
        style={{
          fontWeight: 800,
          fontStyle: 'italic',
          right: '-4vw',
          top: '-6vw',
          x: stampX,
          rotate: `${-TILT}deg`,
          fontSize: 'clamp(9rem, 34vw, 34rem)',
          lineHeight: 0.8,
          color: 'transparent',
          WebkitTextStroke: '2px rgba(255,255,255,0.28)',
          zIndex: 0,
        }}
      >
        26
      </motion.div>
      <motion.div
        aria-hidden
        className="absolute pointer-events-none"
        style={{
          left: '-12%',
          width: '124%',
          bottom: '-7vw',
          height: '19vw',
          x: bandX,
          rotate: '-3deg',
          background: RIOT.ink,
          clipPath: jaggedPx(7, 18),
          zIndex: 1,
        }}
      />

      {/* Centred PORTFOLIO 2026 eyebrow — a tilted slab tag with a ransomed year */}
      <motion.div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        style={{ opacity: eyebrowOpacity, y: eyebrowY, zIndex: 2 }}
      >
        <InkReveal delay={0.25} duration={1.2}>
          <div style={{ rotate: `${TILT}deg`, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.9rem' }}>
            <div
              className="font-display flex items-center whitespace-nowrap"
              style={{ fontSize: 'clamp(1.6rem, 4vw, 3.6rem)', lineHeight: 1, filter: 'drop-shadow(6px 6px 0 #0F1016)' }}
            >
              <span style={{ background: RIOT.face, color: RIOT.ink, padding: '0.12em 0.4em 0.08em', clipPath: jagged(2, 5) }}>
                PORTFOLIO
              </span>
              <span
                className="font-sans"
                style={{
                  fontWeight: 800,
                  fontStyle: 'italic',
                  background: RIOT.ink,
                  color: RIOT.face,
                  padding: '0.12em 0.3em 0.08em',
                  marginLeft: '-0.1em',
                  rotate: '8deg',
                  translate: '0 0.08em',
                  clipPath: jagged(5, 8),
                }}
              >
                2026
              </span>
            </div>
            <span
              className="font-mono uppercase"
              style={{
                fontSize: 'var(--text-label)',
                letterSpacing: '0.22em',
                color: RIOT.face,
                background: RIOT.ink,
                padding: '5px 12px',
                clipPath: jagged(9, 6),
              }}
            >
              Developer &amp; Designer · New York
            </span>
          </div>
        </InkReveal>
      </motion.div>

      {/* Full-bleed wordmark — white on the ink slash; per-glyph hard shadows
          live inside HeroWordmark. */}
      <motion.div
        className="absolute inset-x-0"
        style={{ bottom: '-0.5vw', opacity: wordmarkOpacity, zIndex: 2 }}
      >
        <div style={{ color: '#ffffff' }}>
          <HeroWordmark className="block w-full select-none" />
        </div>
      </motion.div>
    </section>
  )
}
