import { useRef, useState } from 'react'
import { motion, useMotionValue, useSpring, useScroll, useTransform } from 'framer-motion'
import { useLenisContext } from '../App'
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

export default function Hero() {
  const lenisRef = useLenisContext()
  const navigate = (href) => lenisRef?.current?.scrollTo(href, { duration: 1.2 })

  const [hovIdx, setHovIdx] = useState(null)
  const isOrbitPausedRef    = useRef(false)

  // ── Scroll-exit setup ────────────────────────────────────────────────────
  const heroRef = useRef(null)
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  })

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
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-cream"
      onMouseMove={trackMouse}
      onMouseLeave={resetMouse}
    >
      {/* Animated halftone dot field — fades on scroll */}
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 pointer-events-none">
        <HalftoneBg />
      </motion.div>

      {/* Name — pinned to top centre, flies up on scroll */}
      <motion.p
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ y: nameY, opacity: nameOpacity }}
        transition={{ duration: 0.7, delay: 0.1, ease: 'easeOut' }}
        className="absolute top-8 left-1/2 -translate-x-1/2 font-sans text-cobalt/55 text-sm font-semibold tracking-[0.28em] uppercase select-none whitespace-nowrap pointer-events-none"
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
            <ElasticHeading />
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
          background: 'linear-gradient(to bottom, transparent 0%, #1B3A8C 100%)',
        }}
      />
    </section>
  )
}
