import { useRef, useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, useMotionValueEvent, useSpring, useMotionTemplate } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import ProfileHalftone from './about/ProfileHalftone'
import ProjectsHalftone from './projects/ProjectsHalftone'
import { LEFT_COL, CENTER_COL, RIGHT_COL, MAIN_SKILLS, OTHER_SKILLS, DOT_BG } from '../data/aboutData'
import ArtColumn from './about/ArtColumn'
import SkillIcon from './about/SkillIcon'

// ─── SVG Gradient Map (duotone) ───────────────────────────────────────────────
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

// ─── Main component ───────────────────────────────────────────────────────────
export default function About() {
  const containerRef   = useRef(null)
  const lenisRef       = useLenisContext()
  const progress       = useMotionValue(0)
  const fadeProgress   = useMotionValue(0)

  // Ref on the filmstrip profile card — used to read its exact screen position.
  const profileCardRef = useRef(null)
  // Cached rect; refreshed on every scroll tick while the card is settled.
  const cardRectRef    = useRef(null)

  // ── About-profile motion values (driven by useMotionValueEvent, not useTransform)
  // These represent the profile element's ABSOLUTE position/size as it expands
  // from the filmstrip card's last known rect to the right-panel target.
  const aboutLeft    = useMotionValue(0)
  const aboutTop     = useMotionValue(0)
  const aboutW       = useMotionValue(0)
  const aboutH       = useMotionValue(0)
  const aboutOpacity = useMotionValue(0)
  const aboutRadius  = useMotionValue('12px 12px 12px 12px')

  // Filmstrip opacity — quick fade (≈4 vh) when the about phase begins.
  const filmstripOpacity = useMotionValue(1)

  // ── Mouse parallax for profile ───────────────────────────────────────────
  const profileMouseX = useMotionValue(0)
  const profileMouseY = useMotionValue(0)
  const smoothProfileX = useSpring(profileMouseX, { stiffness: 150, damping: 20 })
  const smoothProfileY = useSpring(profileMouseY, { stiffness: 150, damping: 20 })

  const profileRotateX = useTransform(smoothProfileY, [-1, 1], [8, -8])
  const profileRotateY = useTransform(smoothProfileX, [-1, 1], [-8, 8])

  const handleProfileMouseMove = (e) => {
    if (progress.get() < 0.43) return;
    const rect = e.currentTarget.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width * 2 - 1
    const y = (e.clientY - rect.top) / rect.height * 2 - 1
    profileMouseX.set(x)
    profileMouseY.set(y)
  }

  const handleProfileMouseLeave = () => {
    profileMouseX.set(0)
    profileMouseY.set(0)
  }

  // ── Lenis scroll listener ─────────────────────────────────────────────────
  useEffect(() => {
    let unlisten = () => {}
    const t = setTimeout(() => {
      const lenis = lenisRef?.current
      if (!lenis) return
      const calc = (scroll) => {
        const el = containerRef.current
        if (!el) return
        const vh = window.innerHeight
        // Scale progress from 0 to 1 over the ENTIRE 600vh sticky scroll distance.
        // Container is 700vh, sticky scroll is 600vh.
        const activeHeight = vh * 6
        const raw = (scroll - el.offsetTop) / activeHeight
        progress.set(Math.max(0, Math.min(1, raw)))
      }
      const onScroll = ({ scroll }) => calc(scroll)
      calc(lenis.scroll ?? window.scrollY)
      lenis.on('scroll', onScroll)
      unlisten = () => lenis.off('scroll', onScroll)
    }, 0)
    return () => { clearTimeout(t); unlisten() }
  }, [lenisRef, progress])

  // ── Scroll-phase transforms ───────────────────────────────────────────────
  // Re-mapped so everything finishes at progress = 0.5 (which is 300vh)
  
  const colsEntryY  = useTransform(progress, [0.0075, 0.075], ['100vh', '0vh'])
  const framesScale = useTransform(progress, [0.0075, 0.0975], [0.60, 1])

  const leftY   = useTransform(progress, [0.1125, 0.28125], ['0%',   '-55%'])
  const leftX   = useTransform(progress, [0.2925, 0.35],  ['0%', '-140%'])
  const centerY = useTransform(progress, [0.1125, 0.28125], ['0%',  '-76.5%'])
  const rightY  = useTransform(progress, [0.1125, 0.28125], ['0%',  '-62%'])
  const rightX  = useTransform(progress, [0.2925, 0.35],  ['0%',  '140%'])

  const profileColorOpacity = useTransform(progress, [0.255, 0.3075], [0, 1])
  const profileDotsOpacity  = useTransform(progress, [0.255, 0.3075], [1, 0])

  const panelOpacity = useTransform(progress, [0.429, 0.4375], [0, 1])

  const labelY    = useTransform(progress, [0.43, 0.47], ['-50px', '0px'])
  const headingX  = useTransform(progress, [0.439, 0.4775], ['68vw', '0vw'])
  const bodyX     = useTransform(progress, [0.448, 0.4825], ['68vw', '0vw'])
  const bioX      = useTransform(progress, [0.455, 0.4875], ['68vw', '0vw'])
  const skillsX   = useTransform(progress, [0.462, 0.4925], ['68vw', '0vw'])

  const labelO    = useTransform(progress, [0.43, 0.45], [0, 1])
  const headingO  = useTransform(progress, [0.439, 0.4575], [0, 1])
  const bodyO     = useTransform(progress, [0.448, 0.465], [0, 1])
  const bioO      = useTransform(progress, [0.455, 0.471], [0, 1])
  const skillsO   = useTransform(progress, [0.462, 0.4775], [0, 1])
  const resumeX   = useTransform(progress, [0.469, 0.4975], ['68vw', '0vw'])
  const resumeO   = useTransform(progress, [0.469, 0.4845], [0, 1])
  
  // Fade starts at 0.85 (which is 510vh), and ends at 1.0 (which is 600vh).
  // This provides a comfortable pause from 0.5 to 0.85 before the fade out begins.
  const bgColor = useTransform(progress, [0.85, 1.0], ['#1B3A8C', '#F5F0E8'])
  
  // Gradient fade out from bottom to top
  const fadeStop1 = useTransform(progress, [0.85, 1.0], [-100, 100])
  const fadeStop2 = useTransform(progress, [0.85, 1.0], [0, 200])
  const maskImage = useMotionTemplate`linear-gradient(to top, transparent ${fadeStop1}%, black ${fadeStop2}%)`

  // Halftone dots fade in as the About content fades out — seamless handoff to Projects
  const halftoneDotsOpacity = useTransform(progress, [0.85, 1.0], [0, 1])

  // Halftone waves: original sweep, then pause, then complete to top during fade out
  const globalWaveFront = useTransform(progress, [0, 0.5, 0.70, 0.85, 1.0], [0, 0, 0.20, 0.20, 1.0])
  const profileWaveFront = useTransform(progress, [0, 0.606, 0.75, 0.85, 1.0], [0, 0, 0.40, 0.40, 1.0])

  // ── Drive the profile expansion from the card's actual DOM rect ──────────
  useMotionValueEvent(progress, 'change', (v) => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Keep the rect fresh while the profile card is settled on screen.
    if (v >= 0.2815 && profileCardRef.current) {
      if (v < 0.34 || !cardRectRef.current) {
        cardRectRef.current = profileCardRef.current.getBoundingClientRect()
      }
    }

    if (v < 0.34) {
      aboutOpacity.set(0)
      filmstripOpacity.set(1)
      return
    }

    if (v < 0.43) {
      profileMouseX.set(0)
      profileMouseY.set(0)
    }

    const rect = cardRectRef.current
    if (!rect) return

    // Quick filmstrip fade
    const fadeT = Math.max(0, Math.min(1, (v - 0.34) / 0.005))
    filmstripOpacity.set(1 - fadeT)

    // Profile expansion
    const rawT   = Math.max(0, Math.min(1, (v - 0.34) / (0.43 - 0.34)))
    const easedT = rawT < 0.5
      ? 2 * rawT * rawT
      : 1 - Math.pow(-2 * rawT + 2, 2) / 2

    // Target: portrait card on the right side, maintaining 2:3 aspect ratio.
    // 30 % wide, vertically centred, with a small margin from the right edge.
    const targetW    = vw * 0.30
    const targetH    = targetW * (rect.height / rect.width || 1.5)
    const targetLeft = vw * 0.63          // sits in the right portion
    const targetTop  = (vh - targetH) / 2 // vertically centred

    aboutOpacity.set(1)
    
    aboutLeft.set(rect.left   + (targetLeft - rect.left)   * easedT)
    aboutTop.set(rect.top    + (targetTop  - rect.top)    * easedT)
    aboutW.set(rect.width  + (targetW    - rect.width)   * easedT)
    aboutH.set(rect.height + (targetH   - rect.height)  * easedT)

    // Border radius: card 12px → slightly larger card 16px (stays portrait-shaped)
    const r = 12 + (16 - 12) * easedT
    aboutRadius.set(`${r}px`)
  })

  return (
    <motion.div
      id="about"
      ref={containerRef}
      className="relative"
      style={{ height: '700vh', backgroundColor: bgColor }}
    >
      {/* ── Top Boundary Gradient ───────────────────────────────────────── */}
      {/* Fades out the film columns and dots so they don't hit the Hero   */}
      {/* boundary abruptly. Since it's absolute (not sticky), it scrolls  */}
      {/* naturally out of the viewport along with the Hero section.       */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '25vh',
          background: 'linear-gradient(to bottom, #1B3A8C 0%, rgba(27, 58, 140, 0) 100%)',
          zIndex: 20,
        }}
      />

      <DuotoneDefs />

      <div className="sticky top-0 overflow-hidden" style={{ height: '100vh' }}>
        {/* Halftone dots layer — outside masterFade so it persists as content fades */}
        <motion.div
          style={{ opacity: halftoneDotsOpacity, zIndex: 5 }}
          className="absolute inset-0 pointer-events-none"
          aria-hidden
        >
          <ProjectsHalftone containerId="about" />
        </motion.div>

        <motion.div style={{ WebkitMaskImage: maskImage, maskImage, width: '100%', height: '100%' }}>
        {/* ── Global Halftone Background ──────────────────────────────────── */}
        {/* Visible for the entirety of the About section.                     */}
        <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
          <ProfileHalftone waveFront={globalWaveFront} waveHeight={0.25} containerId="about" />
        </div>

        {/* ── Filmstrip grid ──────────────────────────────────────────────── */}
        {/* Quick-fades out (opacity) when the about phase begins so the      */}
        {/* expanding about-photo can take over without a visible double-up.  */}
        <motion.div
          className="absolute inset-0 grid grid-cols-3 gap-4 px-[8vw]"
          style={{
            paddingTop: '5vh',
            paddingBottom: '5vh',
            overflow: 'hidden',
            y: colsEntryY,
            opacity: filmstripOpacity,
            zIndex: 1,
          }}
        >
          <motion.div style={{ y: leftY, x: leftX }}>
            <ArtColumn images={LEFT_COL} scale={framesScale} />
          </motion.div>

          <motion.div style={{ y: centerY }}>
            <ArtColumn
              images={CENTER_COL}
              clearLast
              scale={framesScale}
              profileColorOpacity={profileColorOpacity}
              profileDotsOpacity={profileDotsOpacity}
              profileCardRef={profileCardRef}
            />
          </motion.div>

          <motion.div style={{ y: rightY, x: rightX }}>
            <ArtColumn images={RIGHT_COL} scale={framesScale} />
          </motion.div>
        </motion.div>

        {/* ── About — profile photo ───────────────────────────────────────── */}
        {/* Starts at the filmstrip card's exact getBoundingClientRect        */}
        {/* position/size, then expands scroll-driven to fill the right half. */}
        {/* NO opacity transition on this element — it's a pure positional    */}
        {/* animation with a single-frame appear at progress 0.680.           */}
        <motion.div
          style={{
            position: 'absolute',
            left: aboutLeft,
            top: aboutTop,
            width: aboutW,
            height: aboutH,
            opacity: aboutOpacity,
            borderRadius: aboutRadius,
            zIndex: 3,
            rotateX: profileRotateX,
            rotateY: profileRotateY,
            transformPerspective: 1200,
          }}
          onMouseMove={handleProfileMouseMove}
          onMouseLeave={handleProfileMouseLeave}
          className="group"
        >
          {/* Pulse Glow */}
          <motion.div
            className="absolute inset-0 pointer-events-none"
            style={{ animation: 'pulse-glow 2s ease-out infinite', borderRadius: aboutRadius }}
          />
          {/* Pulse Ring */}
          <motion.div
            className="absolute inset-0 border border-[#f5f0e8] pointer-events-none"
            style={{ animation: 'pulse-ring 2s ease-out infinite', backfaceVisibility: 'hidden', borderRadius: aboutRadius }}
          />
          <motion.div style={{ borderRadius: aboutRadius, overflow: 'hidden', width: '100%', height: '100%', position: 'relative' }}>
            <img
              src="/art/profile.webp"
              alt="Profile"
              className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              style={{ objectPosition: 'top center' }}
            />
            <ProfileHalftone waveFront={profileWaveFront} waveHeight={0.40} />
          </motion.div>
        </motion.div>



        {/* ── Section Label ───────────────────────────────────────────────── */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <motion.p
            className="font-sans text-sm font-semibold tracking-[0.28em] uppercase select-none whitespace-nowrap pointer-events-none"
            style={{
              color: 'rgba(245,240,232,0.45)',
              y: labelY,
              opacity: labelO,
            }}
          >
            About
          </motion.p>
        </div>

        {/* ── About — text panel ──────────────────────────────────────────── */}
        {/* Each child slides out from behind the profile photo in staggered   */}
        {/* order, creating a hierarchy cascade effect.                        */}
        <motion.div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '65%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            paddingLeft: '6vw',
            paddingRight: '4vw',
            background: 'transparent',
            opacity: panelOpacity,
            zIndex: 2,
            overflow: 'hidden',
          }}
        >
          {/* 2 — Heading (second out) */}
          <motion.h2
            style={{
              fontFamily: "'EastBlue', 'Abril Fatface', serif",
              fontSize: 'clamp(56px, 7vw, 96px)',
              lineHeight: 0.95,
              color: 'var(--color-cream)',
              marginBottom: '28px',
              x: headingX,
              opacity: headingO,
            }}
          >
            Hello! I'm Andrew.
          </motion.h2>

          {/* 3 — Primary bio quote (third out) */}
          <motion.p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '14px',
              lineHeight: 1.9,
              color: 'var(--color-cream)',
              marginBottom: '12px',
              x: bodyX,
              opacity: bodyO,
            }}
          >
            I&rsquo;m a software developer and designer based in New York, 
            currently pursuing my BS in Computer Science at Queens College. 
            Over the course of my studies, I&rsquo;ve realized that my favorite 
            kind of engineering is the kind that solves real, everyday problems for people.  
            Having always had a deep appreciation for visual art, I naturally gravitate toward 
            frontend development and polished UI design. But what truly drives me is collaboration. 
          </motion.p>

          {/* 4 — Secondary bio (fourth out) */}
          <motion.p
            style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: '14px',
              lineHeight: 1.9,
              color: 'var(--color-cream)',
              marginBottom: '28px',
              x: bioX,
              opacity: bioO,
            }}
          >
            Whether I&apos;m managing developer workflows, diving into digital illustration, or crafting a new brand identity, 
            I thrive at the intersection of creativity and community.  I&apos;m always looking to connect with fellow developers, 
            creators, and tech enthusiasts. Let&apos;s build something cool together!
          </motion.p>

          {/* 5 — Skills label + chips (last out) */}
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <motion.p style={{
              x: skillsX,
              opacity: skillsO,
              fontFamily: "'DM Sans', sans-serif",
              fontWeight: 700,
              fontSize: '10px',
              letterSpacing: '0.2em',
              textTransform: 'uppercase',
              color: 'rgba(245,240,232,0.4)',
              marginBottom: '12px',
            }}>
              Tech Stack &amp; Skills
            </motion.p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
              {MAIN_SKILLS.map((skill, index) => (
                <SkillIcon key={skill.name} skill={skill} index={index} progress={progress} isMain />
              ))}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {OTHER_SKILLS.map((skill, index) => (
                <SkillIcon key={skill.name} skill={skill} index={MAIN_SKILLS.length + index} progress={progress} />
              ))}
            </div>

            <motion.a
              href="/resume.pdf"
              target="_blank"
              rel="noopener noreferrer"
              style={{
                x: resumeX,
                opacity: resumeO,
                marginTop: '24px',
                padding: '12px 40px'
              }}
              className="relative group flex items-center justify-center border border-[#f5f0e826] bg-white/5 transition-all duration-300 hover:bg-white/75 hover:border-[#f5f0e866] hover:-translate-y-1 cursor-pointer w-fit rounded-2xl"
            >
              <style>{`
                @keyframes pulse-glow {
                  0% {
                    background-color: rgba(245, 240, 232, 0.15);
                    box-shadow: 0px 0px 20px 0px rgba(245, 240, 232, 0.2);
                  }
                  100% {
                    background-color: rgba(245, 240, 232, 0);
                    box-shadow: 0px 0px 0px 0px rgba(245, 240, 232, 0);
                  }
                }
                @keyframes pulse-ring {
                  0% {
                    transform: scale(1);
                    opacity: 0.6;
                  }
                  100% {
                    transform: scale(1.15);
                    opacity: 0;
                  }
                }
              `}</style>
              {/* Button Glow */}
              <div
                className="absolute inset-0 rounded-2xl pointer-events-none"
                style={{ animation: 'pulse-glow 2s ease-out infinite' }}
              />
              {/* Expanding Skinny Ring */}
              <div
                className="absolute inset-0 rounded-2xl border border-[#f5f0e8] pointer-events-none"
                style={{ animation: 'pulse-ring 2s ease-out infinite', backfaceVisibility: 'hidden' }}
              />
              <span className="relative z-10 font-sans font-bold text-sm tracking-[0.2em] uppercase text-[rgba(255,255,255,0.75)] transition-colors duration-300 group-hover:text-cobalt">
                Resume
              </span>
            </motion.a>
          </div>
        </motion.div>
        </motion.div>
      </div>
    </motion.div>
  )
}
