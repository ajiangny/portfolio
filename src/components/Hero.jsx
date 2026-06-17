/**
 * Hero.jsx — Landing Section
 *
 * The first viewport the user sees. Composed of:
 *   • The site-wide fluid gradient (FluidGradient, in App.jsx) shows through —
 *     Hero is background-transparent; cursor warps the cobalt field
 *   • ElasticHeading — "Portfolio" title with letter-repulsion physics
 *   • OrbitBubble ×4 — floating nav links that orbit the heading
 *   • Cream-on-cobalt colour system via --hero-* CSS custom properties
 *
 * Scroll behaviour:
 *   • Heading scales up, rises, and fades out
 *   • Bubbles explode outward
 *   • Content fades/explodes; the cobalt gradient persists beneath into About
 */
import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion'

import { useTransitionContext } from '../context/TransitionContext'
import { NAV_SECTIONS, goToSection } from '../config/sections'
import useMediaQuery from '../hooks/useMediaQuery'
import ElasticHeading from './hero/ElasticHeading'
import OrbitBubble from './hero/OrbitBubble'
import { BLOB_SHAPES } from './hero/orbitConstants'
import { HERO_REST, HERO_HOVER, applyHeroTheme, clearHeroTheme } from './hero/heroThemes'
import { setHoverSection } from './gradient/hoverSignal'

const rgbStr = (triple) => `rgb(${triple})`
// Blobs are frosted glass: the themed fill becomes a low-alpha tint so the
// backdrop-filter behind it (in OrbitBubble) frosts the gradient through.
const BUBBLE_GLASS_ALPHA = 0.22
const rgbaStr = (triple, a) => `rgba(${triple}, ${a})`

const PARALLAX_STRENGTHS = [0.055, 0.09, 0.038, 0.072]

export default function Hero() {
  const { navigate: transitionNavigate } = useTransitionContext()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const [hovIdx, setHovIdx] = useState(null)
  const isOrbitPausedRef = useRef(false)

  const navigate = (href, e, clickedIdx) => {
    const go = () => {
      // Colour + landing offset both come from config/sections.js
      goToSection(transitionNavigate, href.slice(1), e)
      // Clear the tap/hover tint once the curtain has covered the screen
      // (600ms expand) so it can't linger if the user scrolls back to Hero.
      setTimeout(() => setHovIdx(null), 650)
    }

    // Mobile has no hover preview, so on tap flash the section's colour
    // scheme first, then run the transition. The tint is cleared after the
    // curtain covers the screen (the setTimeout above).
    if (isMobile && clickedIdx !== undefined && clickedIdx !== null) {
      setHovIdx(clickedIdx)
      setTimeout(go, 300)
    } else {
      go()
    }
  }

  // ── Scroll-exit setup ────────────────────────────────────────────────────
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // ── Hero theme + hover preview ──────────────────────────────────────────
  // hovIdx is the NAV index (0..3); the SECTIONS index is hovIdx + 1. Bubbles
  // only register hover at the top of Hero (they fade + go non-interactive on
  // scroll), so hovIdx != null already implies we're at the top.
  const sectionIdx = hovIdx == null ? -1 : hovIdx + 1
  const theme = sectionIdx > 0 ? HERO_HOVER[sectionIdx] : HERO_REST

  // wordmark + name tag recolor via CSS vars (CSS transition smooths it);
  // the bubbles recolor via Framer props (see below).
  useEffect(() => { applyHeroTheme(theme) }, [theme])
  useEffect(() => clearHeroTheme, [])

  // Preview the hovered nav blob's section palette in the background gradient.
  // sectionIdx is the SECTIONS index (1..4) or -1; the gradient gates it to
  // Hero being centred. Reset to -1 on unmount so it can't linger.
  useEffect(() => { setHoverSection(sectionIdx) }, [sectionIdx])
  useEffect(() => () => setHoverSection(-1), [])

  // Heading: scale up + rise + fade
  const headingScale = useTransform(scrollYProgress, [0, 0.55], [1, 1.18])
  const headingY = useTransform(scrollYProgress, [0, 0.55], [0, -70])
  const headingOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0])

  // Name tag: fly up + fade
  const nameY = useTransform(scrollYProgress, [0, 0.35], [0, -110])
  const nameOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0])

  // ── Mouse parallax ───────────────────────────────────────────────────────
  const heroMouseX = useMotionValue(0)
  const heroMouseY = useMotionValue(0)
  const smoothMouseX = useSpring(heroMouseX, { stiffness: 120, damping: 18 })
  const smoothMouseY = useSpring(heroMouseY, { stiffness: 120, damping: 18 })

  // Heading parallax — subtle reverse motion for depth
  const headingParallaxX = useTransform(smoothMouseX, (x) => x * -0.035)
  const headingParallaxY = useTransform(smoothMouseY, (y) => y * -0.035)

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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: 'transparent' }}
      onMouseMove={trackMouse}
      onMouseLeave={resetMouse}
    >
      {/* Name + year — pinned to top centre, flies up on scroll.
          shine-text adds the periodic diagonal sweep (faster on hover). */}
      <motion.p
        style={{ y: nameY, opacity: nameOpacity, zIndex: 50, '--shine-base': 'rgba(var(--hero-name-rgb), 0.55)', transition: 'color 0.35s ease' }}
        className="shine-text absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-3 font-sans text-eyebrow font-semibold tracking-[0.28em] uppercase select-none whitespace-nowrap pointer-events-auto cursor-default"
      >
        {/* shine-text sits on the parent so one highlight band sweeps the
            whole header (name, dot, year) as a single continuous surface */}
        <span>Andrew Jiang</span>
        <span
          aria-hidden="true"
          className="rounded-full shrink-0"
          style={{ width: '5px', height: '5px', backgroundColor: 'rgba(var(--hero-name-rgb), 0.45)' }}
        />
        <span>2026</span>
      </motion.p>

      {/* Orbit arena — heading + floating nav bubbles */}
      <div
        className="relative w-full flex items-center justify-center"
        style={{ height: '65vh' }}
      >
        {/* Elastic heading — scales up & fades out on scroll */}
        <motion.div
          className="relative z-10 text-center"
          style={{ scale: headingScale, y: headingY, opacity: headingOpacity }}
        >
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.9, delay: 0.15, ease: [0.25, 0.46, 0.45, 0.94] }}
          >
            <motion.div style={{ x: headingParallaxX, y: headingParallaxY }}>
              <ElasticHeading
                ariaLabel="Andrew Jiang — Portfolio. Developer and designer."
                className="font-display leading-none select-none"
                style={{
                  fontSize: 'var(--text-hero)',
                  letterSpacing: '-0.01em',
                  // Glass-look letters: translucent fill lets the gradient show
                  // through each glyph; the bright top edge + dark drop shadow
                  // give it a beveled-glass read. (No backdrop blur — CSS can't
                  // frost per-glyph; this is the look, not a true frost.)
                  color: 'rgba(var(--hero-wordmark-rgb), 0.58)',
                  textShadow: [
                    '0 1px 0 rgba(255,255,255,0.45)',   // bright top bevel
                    '0 -1px 1px rgba(255,255,255,0.22)',
                    '0 6px 18px rgba(10,15,40,0.38)',   // soft cast shadow
                  ].join(', '),
                  transition: 'color 0.35s ease',
                }}
              />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Orbiting nav bubbles — explode outward on scroll */}
        {NAV_SECTIONS.map((section, i) => (
          <OrbitBubble
            key={section.id}
            label={section.label}
            href={`#${section.id}`}
            angleOffset={(i / NAV_SECTIONS.length) * Math.PI * 2}
            onNavigate={navigate}
            myIdx={i}
            hoveredIdx={hovIdx}
            onHoverChange={setHovIdx}
            blobShape={BLOB_SHAPES[i]}
            bubbleFill={rgbaStr(theme.bubbleFill, BUBBLE_GLASS_ALPHA)}
            bubbleText={rgbStr(theme.bubbleText)}
            smoothMouseX={smoothMouseX}
            smoothMouseY={smoothMouseY}
            parallaxStrength={PARALLAX_STRENGTHS[i]}
            orbitPausedRef={isOrbitPausedRef}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>

    </section>
  )
}
