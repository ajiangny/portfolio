/**
 * Hero.jsx — Landing Section
 *
 * The first viewport the user sees. Composed of:
 *   • HalftoneBg canvas — dot-gradient background that responds to mouse
 *   • ElasticHeading — "Portfolio" title with letter-repulsion physics
 *   • OrbitBubble ×4 — floating nav links that orbit the heading
 *   • Dynamic colour system — cobalt hue shifts on hover/scroll
 *     via CSS custom properties (--color-cobalt, --color-hero-bg, etc.)
 *
 * Scroll behaviour:
 *   • Heading scales up, rises, and fades out
 *   • Bubbles explode outward
 *   • Background fades, revealing the cobalt About section beneath
 */
import { useRef, useState, useEffect } from 'react'
import { motion, useMotionValue, useSpring, useScroll, useTransform, useMotionValueEvent, animate } from 'framer-motion'

import { useTransitionContext } from '../context/TransitionContext'
import HalftoneBg    from './hero/HalftoneBg'
import ElasticHeading from './hero/ElasticHeading'
import OrbitBubble from './hero/OrbitBubble'
import { BLOB_SHAPES } from './hero/orbitConstants'

const navLinks = [
  { label: 'About',    href: '#about'    },
  { label: 'Projects', href: '#projects' },
  { label: 'Gallery',  href: '#gallery'  },
  { label: 'Contact',  href: '#contact'  },
]

const PARALLAX_STRENGTHS = [0.055, 0.09, 0.038, 0.072]

const HOVER_COLORS = [
  { rgb: [37, 79, 193] },    // About: brighter cobalt
  { rgb: [245, 240, 232] },  // Projects: cream
  { rgb: [0, 0, 0] },        // Gallery: black
  { rgb: [245, 240, 232] },  // Contact: cream (inverse of Gallery)
]

export default function Hero() {
  const { navigate: transitionNavigate, isActive } = useTransitionContext()
  const isTransitionActiveRef = useRef(isActive)
  
  useEffect(() => {
    isTransitionActiveRef.current = isActive
  }, [isActive])
  
  const navigate = (href, e, clickedIdx) => {
    let colorStr = 'var(--color-cobalt)'
    if (clickedIdx !== undefined && clickedIdx !== null) {
      const col = HOVER_COLORS[clickedIdx].rgb
      colorStr = `rgb(${col[0]}, ${col[1]}, ${col[2]})`
    }

    if (href === '#about') {
      transitionNavigate('#about', { offset: window.innerHeight * 3 }, e, colorStr)
    } else if (href === '#projects') {
      transitionNavigate('#projects', { offset: window.innerHeight }, e, colorStr)
    } else {
      transitionNavigate(href, {}, e, colorStr)
    }
  }

  const [hovIdx, setHovIdx] = useState(null)
  const isOrbitPausedRef    = useRef(false)

  // ── Scroll-exit setup ────────────────────────────────────────────────────
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

  // ── Dynamic Cobalt Hover Colors ──────────────────────────────────────────
  const colorState = useRef({
    r: 27, g: 58, b: 140,
    bgR: 245, bgG: 240, bgB: 232,
    txtR: 245, txtG: 240, txtB: 232
  })
  const colorRgbValue = useMotionValue('27,58,140')
  const animationRef = useRef(null)

  const updateColor = (latestScroll, hoverIndex) => {
    let target = {
      r: 27, g: 58, b: 140,
      bgR: 245, bgG: 240, bgB: 232,
      txtR: 245, txtG: 240, txtB: 232
    }

    if (!isTransitionActiveRef.current && latestScroll <= 0.05 && hoverIndex !== null) {
      const col = HOVER_COLORS[hoverIndex].rgb
      target.r = col[0]
      target.g = col[1]
      target.b = col[2]

      if (hoverIndex === 1) { // Projects (Cream blob)
        // Swap background to cobalt, and blob text to cobalt
        target.bgR = 27; target.bgG = 58; target.bgB = 140;
        target.txtR = 27; target.txtG = 58; target.txtB = 140;
      } else if (hoverIndex === 3) { // Contact (Cream blob, inverse of Gallery)
        // Swap background to black, and blob text to black
        target.bgR = 0; target.bgG = 0; target.bgB = 0;
        target.txtR = 0; target.txtG = 0; target.txtB = 0;
      }
    } else {
      // Smoothly transition base cobalt to bright cobalt as we scroll down to About
      const p = Math.max(0, Math.min(1, latestScroll));
      target.r = 27 + (37 - 27) * p;
      target.g = 58 + (79 - 58) * p;
      target.b = 140 + (193 - 140) * p;
    }

    if (animationRef.current) animationRef.current.stop()

    const startObj = { ...colorState.current }
    const lerp = (start, end, p) => start + (end - start) * p

    animationRef.current = animate(0, 1, {
      duration: 0.4,
      ease: "easeOut",
      onUpdate: (p) => {
        const r = Math.round(lerp(startObj.r, target.r, p))
        const g = Math.round(lerp(startObj.g, target.g, p))
        const b = Math.round(lerp(startObj.b, target.b, p))
        const bgR = Math.round(lerp(startObj.bgR, target.bgR, p))
        const bgG = Math.round(lerp(startObj.bgG, target.bgG, p))
        const bgB = Math.round(lerp(startObj.bgB, target.bgB, p))
        const txtR = Math.round(lerp(startObj.txtR, target.txtR, p))
        const txtG = Math.round(lerp(startObj.txtG, target.txtG, p))
        const txtB = Math.round(lerp(startObj.txtB, target.txtB, p))

        colorState.current = { r, g, b, bgR, bgG, bgB, txtR, txtG, txtB }

        const rgbStr = `${r},${g},${b}`
        colorRgbValue.set(rgbStr)

        document.documentElement.style.setProperty('--color-cobalt-rgb', rgbStr)
        document.documentElement.style.setProperty('--color-cobalt', `rgb(${r}, ${g}, ${b})`)
        document.documentElement.style.setProperty('--color-hero-bg', `rgb(${bgR}, ${bgG}, ${bgB})`)
        document.documentElement.style.setProperty('--color-cobalt-text', `rgb(${txtR}, ${txtG}, ${txtB})`)
      }
    })
  }

  useMotionValueEvent(scrollYProgress, "change", (latest) => updateColor(latest, hovIdx))
  
  useEffect(() => {
    updateColor(scrollYProgress.get(), hovIdx)
  }, [hovIdx])

  useEffect(() => {
    return () => {
      document.documentElement.style.removeProperty('--color-cobalt')
      document.documentElement.style.removeProperty('--color-cobalt-rgb')
      document.documentElement.style.removeProperty('--color-hero-bg')
      document.documentElement.style.removeProperty('--color-cobalt-text')
    }
  }, [])
  // Heading: scale up + rise + fade
  const headingScale   = useTransform(scrollYProgress, [0, 0.55], [1, 1.18])
  const headingY       = useTransform(scrollYProgress, [0, 0.55], [0, -70])
  const headingOpacity = useTransform(scrollYProgress, [0, 0.45], [1, 0])

  // Name tag: fly up + fade
  const nameY       = useTransform(scrollYProgress, [0, 0.35], [0, -110])
  const nameOpacity = useTransform(scrollYProgress, [0, 0.3],  [1, 0])

  // Halftone background: fade out
  const bgOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0])

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
    heroMouseX.set(e.clientX - r.left - r.width  / 2)
    heroMouseY.set(e.clientY - r.top  - r.height / 2)
  }
  const resetMouse = () => { heroMouseX.set(0); heroMouseY.set(0) }

  return (
    <section
      ref={heroRef}
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ backgroundColor: 'var(--color-hero-bg, var(--color-cream))' }}
      onMouseMove={trackMouse}
      onMouseLeave={resetMouse}
    >
      {/* Animated halftone dot field — fades on scroll */}
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 pointer-events-none">
        <HalftoneBg containerId="hero" colorRgbValue={colorRgbValue} />
      </motion.div>

      {/* Name — pinned to top centre, flies up on scroll */}
      <motion.p
        style={{ y: nameY, opacity: nameOpacity, color: 'rgba(var(--color-cobalt-rgb), 0.55)', zIndex: 50 }}
        className="absolute top-8 left-1/2 -translate-x-1/2 font-sans text-sm font-semibold tracking-[0.28em] uppercase select-none whitespace-nowrap pointer-events-none"
      >
        Andrew Jiang
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
              <ElasticHeading />
            </motion.div>
          </motion.div>
        </motion.div>

        {/* Orbiting nav bubbles — explode outward on scroll */}
        {navLinks.map((link, i) => (
          <OrbitBubble
            key={link.href}
            label={link.label}
            href={link.href}
            angleOffset={(i / navLinks.length) * Math.PI * 2}
            onNavigate={navigate}
            myIdx={i}
            hoveredIdx={hovIdx}
            onHoverChange={setHovIdx}
            blobShape={BLOB_SHAPES[i]}
            smoothMouseX={smoothMouseX}
            smoothMouseY={smoothMouseY}
            parallaxStrength={PARALLAX_STRENGTHS[i]}
            orbitPausedRef={isOrbitPausedRef}
            scrollYProgress={scrollYProgress}
          />
        ))}
      </div>

      {/* Gradient fade cream → cobalt at section boundary — no gap */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 pointer-events-none"
        style={{
          height: '140px',
          background: 'linear-gradient(to bottom, transparent 0%, var(--color-cobalt) 100%)',
        }}
      />
    </section>
  )
}
