/**
 * About.jsx — About Section
 *
 * A 700vh scroll-driven section with three phases:
 *
 * Phase 1 — Filmstrip (progress 0→0.28):
 *   Three columns of duotone artwork scroll upward at different speeds,
 *   then part outward to reveal the profile photo.
 *
 * Phase 2 — Profile Expansion (progress 0.34→0.43):
 *   The profile card's exact DOM rect is read and used as the start
 *   position for a smooth expansion to a larger portrait on the right.
 *
 * Phase 3 — Text Panel (progress 0.43→0.50):
 *   Heading, bio, skills, and resume button slide in from behind the
 *   profile photo in a staggered cascade.
 *
 * Fade-out (progress 0.85→1.0):
 *   Content fades via a CSS mask gradient while ProjectsHalftone dots
 *   rise in to create a seamless handoff to the Projects section.
 */
import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useMotionValueEvent, useSpring, useMotionTemplate, useScroll } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import ProfileHalftone from './about/ProfileHalftone'
import ProjectsHalftone from './projects/ProjectsHalftone'
import { LEFT_COL, CENTER_COL, CENTER_PROFILE_INDEX, RIGHT_COL, MAIN_SKILLS, OTHER_SKILLS } from '../data/aboutData'
import ArtColumn from './about/ArtColumn'
import SkillIcon from './about/SkillIcon'
import ElasticHeading from './hero/ElasticHeading'
import SectionNav from './SectionNav'

// ─── SVG Gradient Map (duotone) ───────────────────────────────────────────────
function DuotoneDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
      <defs>
        <filter id="duotone-art" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="gray" />
          <feComponentTransfer colorInterpolationFilters="sRGB">
            <feFuncR type="table" tableValues="0.145 0.961" />
            <feFuncG type="table" tableValues="0.310 0.941" />
            <feFuncB type="table" tableValues="0.757 0.910" />
          </feComponentTransfer>
        </filter>
      </defs>
    </svg>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function About() {
  const containerRef = useRef(null)
  const lenisRef = useLenisContext()
  const progress = useMotionValue(0)
  const isMobile = useMediaQuery('(max-width: 767px)')

  // Ref on the filmstrip profile card — used to read its exact screen position.
  const profileCardRef = useRef(null)
  // Cached rect; refreshed on every scroll tick while the card is settled.
  const cardRectRef = useRef(null)

  // ── About-profile motion values (driven by useMotionValueEvent, not useTransform)
  // These represent the profile element's ABSOLUTE position/size as it expands
  // from the filmstrip card's last known rect to the right-panel target.
  const aboutLeft = useMotionValue(0)
  const aboutTop = useMotionValue(0)
  const aboutW = useMotionValue(0)
  const aboutH = useMotionValue(0)
  const aboutOpacity = useMotionValue(0)
  const aboutRadius = useMotionValue('12px 12px 12px 12px')

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
    let unlisten = () => { }
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

  const colsEntryY = useTransform(progress, [0.0075, 0.075], ['100vh', '0vh'])
  const framesScale = useTransform(progress, [0.0075, 0.0975], [0.60, 1])

  // Distant blank strips — small, light placeholders that fall down
  // through the cobalt opening before the real filmstrip rises in,
  // selling the "falling from a distance" depth as the section opens.
  const miniY = useTransform(progress, [0, 0.09], ['-90vh', '90vh'])
  const miniO = useTransform(progress, [0, 0.015, 0.055, 0.085], [0, 1, 1, 0])

  const leftY = useTransform(progress, [0.1125, 0.28125], ['0%', '-55%'])
  const leftX = useTransform(progress, [0.2925, 0.35], ['0%', '-140%'])
  const rightY = useTransform(progress, [0.1125, 0.28125], ['0%', '-62%'])
  const rightX = useTransform(progress, [0.2925, 0.35], ['0%', '140%'])

  // Centre column travel is measured, not a hard-coded %, so the strip
  // stops scrolling exactly when the profile card reaches viewport centre.
  // offsetTop is layout-based (ignores transforms), measured against the
  // grid container which is pinned to the sticky viewport.
  const centerColEndShift = useRef(0)
  useEffect(() => {
    const measure = () => {
      const card = profileCardRef.current
      if (!card) return
      centerColEndShift.current =
        window.innerHeight / 2 - (card.offsetTop + card.offsetHeight / 2)
    }
    measure()
    const t = setTimeout(measure, 400) // re-measure once layout fully settles
    window.addEventListener('resize', measure)
    return () => { clearTimeout(t); window.removeEventListener('resize', measure) }
  }, [isMobile])
  const centerY = useTransform(progress, (v) => {
    const t = Math.max(0, Math.min(1, (v - 0.1125) / (0.28125 - 0.1125)))
    return t * centerColEndShift.current
  })

  // Once the overlay owns the profile (0.31), the centre column splits:
  // cards above the profile fly up, cards below fly down (see ArtColumn)
  const profileExit = useTransform(progress, [0.31, 0.37], [0, 1])

  const profileColorOpacity = useTransform(progress, [0.255, 0.3075], [0, 1])
  const profileDotsOpacity = useTransform(progress, [0.255, 0.3075], [1, 0])
  // The expanding overlay takes over at 0.31 — hide the filmstrip's own
  // profile card right then so the two never double up.
  const profileCardHide = useTransform(progress, [0.31, 0.318], [1, 0])

  // Text reveals start at ~0.505, while the centred portrait is gliding
  // to its resting spot (photo journey ends at 0.52) — see the
  // useMotionValueEvent below for the three-stage photo choreography.
  const panelOpacity = useTransform(progress, [0.504, 0.5125], [0, 1])

  const labelY = useTransform(progress, [0.505, 0.545], ['-50px', '0px'])
  const headingX = useTransform(progress, [0.514, 0.5525], ['68vw', '0vw'])
  const bodyX = useTransform(progress, [0.523, 0.5575], ['68vw', '0vw'])
  const bioX = useTransform(progress, [0.53, 0.5625], ['68vw', '0vw'])
  const skillsX = useTransform(progress, [0.537, 0.5675], ['68vw', '0vw'])

  const labelO = useTransform(progress, [0.505, 0.525], [0, 1])
  const headingO = useTransform(progress, [0.514, 0.5325], [0, 1])
  const bodyO = useTransform(progress, [0.523, 0.54], [0, 1])
  const bioO = useTransform(progress, [0.53, 0.546], [0, 1])
  const skillsO = useTransform(progress, [0.537, 0.5525], [0, 1])
  const resumeX = useTransform(progress, [0.544, 0.5725], ['68vw', '0vw'])
  const resumeO = useTransform(progress, [0.544, 0.5595], [0, 1])

  // Fade starts at 0.85 (which is 510vh), and ends at 1.0 (which is 600vh).
  // This provides a comfortable pause from 0.5 to 0.85 before the fade out begins.
  const bgFadeOpacity = useTransform(progress, [0.85, 1.0], [0, 1])

  // Gradient fade out from bottom to top
  const fadeStop1 = useTransform(progress, [0.85, 1.0], [-100, 100])
  const fadeStop2 = useTransform(progress, [0.85, 1.0], [0, 200])
  const maskImage = useMotionTemplate`linear-gradient(to top, transparent ${fadeStop1}%, black ${fadeStop2}%)`

  // Halftone dots fade in as the About content fades out — seamless handoff to Projects
  const halftoneDotsOpacity = useTransform(progress, [0.85, 1.0], [0, 1])

  // Track the native scroll transition from About to Projects
  const { scrollYProgress: transitionProgress } = useScroll({
    target: containerRef,
    offset: ['end end', 'end start'] // Tracks the 100vh native scroll as About unpins and scrolls away
  })

  // Single continuous wave sweeps from 0 to 2 on About's canvas
  const lineWaveFront = useTransform(transitionProgress, [0, 1], [0, 2])

  // Halftone waves: original sweep, then pause, then complete to top during fade out
  const globalWaveFront = useTransform(progress, [0, 0.5, 0.70, 0.85, 1.0], [0, 0, 0.20, 0.20, 1.0])
  // Desktop: dots creep up the lower part of the portrait at rest.
  // Mobile: the portrait is small and top-centre — dots crawling over it
  // read as a glitch, so the wave only runs during the final fade-out.
  const profileWaveDesktop = useTransform(progress, [0, 0.606, 0.75, 0.85, 1.0], [0, 0, 0.40, 0.40, 1.0])
  const profileWaveMobile = useTransform(progress, [0, 0.85, 1.0], [0, 0, 1.0])
  const profileWaveFront = isMobile ? profileWaveMobile : profileWaveDesktop

  // ── Drive the profile expansion from the card's actual DOM rect ──────────
  useMotionValueEvent(progress, 'change', (v) => {
    const vw = window.innerWidth
    const vh = window.innerHeight

    // Keep the rect fresh while the profile card is settled on screen.
    if (v >= 0.2815 && profileCardRef.current) {
      if (v < 0.31 || !cardRectRef.current) {
        cardRectRef.current = profileCardRef.current.getBoundingClientRect()
      }
    }

    if (v < 0.31) {
      aboutOpacity.set(0)
      filmstripOpacity.set(1)
      return
    }

    if (v < 0.52) {
      profileMouseX.set(0)
      profileMouseY.set(0)
    }

    const rect = cardRectRef.current
    if (!rect) return

    // Filmstrip fade — after the side columns have parted (0.35) and the
    // centre cards have mostly rolled out (exit runs 0.31→0.37)
    const fadeT = Math.max(0, Math.min(1, (v - 0.355) / 0.015))
    filmstripOpacity.set(1 - fadeT)

    // ── Three-stage profile journey ──────────────────────────────────
    //  A    (0.31→0.37): card glides to a large CENTRED portrait while the
    //       side columns part (0.2925→0.35) — the filmstrip phase ENDS
    //       with the profile centre-stage
    //  hold (0.37→0.45): rests centre-stage — the filmstrip's finale
    //  B    (0.45→0.52): glides to its About resting spot
    //       desktop → right panel, mobile → compact top-centre
    const mobile = vw < 768
    const ratio = rect.height / rect.width || 1.5
    const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2)
    const lerpRect = (a, b, t) => ({
      left: a.left + (b.left - a.left) * t,
      top: a.top + (b.top - a.top) * t,
      w: a.w + (b.w - a.w) * t,
      h: a.h + (b.h - a.h) * t,
    })

    const start = { left: rect.left, top: rect.top, w: rect.width, h: rect.height }

    const centerW = mobile ? vw * 0.56 : vw * 0.34
    const centerH = centerW * ratio
    const center = { left: (vw - centerW) / 2, top: (vh - centerH) / 2, w: centerW, h: centerH }

    // Mobile resting card mirrors a profile-page hero: large, slightly
    // squarer than the filmstrip's 2:3 (the ratio morphs during stage B).
    const finalW = mobile ? vw * 0.78 : vw * 0.30
    const finalH = finalW * (mobile ? 1.05 : ratio)
    const final = mobile
      // 104px clears the SectionNav label (top-8 + 60px tall) on any phone
      ? { left: (vw - finalW) / 2, top: 104, w: finalW, h: finalH }
      : { left: vw * 0.63, top: (vh - finalH) / 2, w: finalW, h: finalH }

    let cur
    if (v < 0.37)      cur = lerpRect(start, center, ease(Math.max(0, (v - 0.31) / 0.06)))
    else if (v < 0.45) cur = center
    else if (v < 0.52) cur = lerpRect(center, final, ease((v - 0.45) / 0.07))
    else               cur = final

    aboutOpacity.set(1)
    aboutLeft.set(cur.left)
    aboutTop.set(cur.top)
    aboutW.set(cur.w)
    aboutH.set(cur.h)

    // Border radius: card 12px → slightly larger card 16px (stays portrait-shaped)
    const r = 12 + 4 * Math.min(1, (v - 0.31) / 0.21)
    aboutRadius.set(`${r}px`)
  })

  return (
    <motion.div
      id="about"
      ref={containerRef}
      className="relative"
      style={{ height: '700vh', backgroundColor: 'var(--color-cobalt)' }}
    >
      {/* bottom:-2px overlaps Projects so device-pixel rounding on phones
          can't expose a cobalt hairline between the sections */}
      <motion.div
        className="absolute left-0 right-0 top-0 pointer-events-none"
        style={{ backgroundColor: 'var(--color-cream)', opacity: bgFadeOpacity, zIndex: 0, bottom: '-2px' }}
      />
      {/* ── Top Boundary Gradient ───────────────────────────────────────── */}
      {/* Fades out the film columns and dots so they don't hit the Hero   */}
      {/* boundary abruptly. Since it's absolute (not sticky), it scrolls  */}
      {/* naturally out of the viewport along with the Hero section.       */}
      <div
        className="absolute top-0 left-0 right-0 pointer-events-none"
        style={{
          height: '25vh',
          background: 'linear-gradient(to bottom, var(--color-cobalt) 0%, transparent 100%)',
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
          <ProjectsHalftone containerId="projects" lineWaveFront={lineWaveFront} lineWaveHeight={0.15} />
        </motion.div>

        <motion.div style={{ WebkitMaskImage: maskImage, maskImage, width: '100%', height: '100%' }}>
          {/* ── Global Halftone Background ──────────────────────────────────── */}
          {/* Visible for the entirety of the About section.                     */}
          <div className="absolute inset-0 pointer-events-none" style={{ zIndex: 0 }}>
            <ProfileHalftone waveFront={globalWaveFront} waveHeight={0.25} containerId="about" />
          </div>

          {/* ── Distant strips — depth cue ahead of the filmstrip ──────────── */}
          <motion.div
            className="absolute inset-0 grid grid-cols-3 gap-6 px-[30vw]"
            style={{ y: miniY, opacity: miniO, zIndex: 1 }}
            aria-hidden="true"
          >
            {[0, 1, 2].map((col) => (
              <div key={col} className="flex flex-col gap-3" style={{ marginTop: col * 48 }}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="shrink-0"
                    style={{
                      aspectRatio: '2 / 3',
                      borderRadius: '8px',
                      background: 'rgba(245,240,232,0.10)',
                      border: '1px solid rgba(245,240,232,0.14)',
                    }}
                  />
                ))}
              </div>
            ))}
          </motion.div>

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
              // Mobile: the grid is wider than the viewport so columns are
              // tall enough to actually scroll — at natural size every image
              // fit on screen and the filmstrip effect was invisible.
              ...(isMobile ? { width: '176vw', left: '-38vw', right: 'auto' } : {}),
            }}
          >
            <motion.div style={{ y: leftY, x: leftX, willChange: 'transform' }}>
              <ArtColumn images={LEFT_COL} scale={framesScale} lite={isMobile} />
            </motion.div>

            <motion.div style={{ y: centerY, willChange: 'transform' }}>
              <ArtColumn
                images={CENTER_COL}
                clearLast
                scale={framesScale}
                profileColorOpacity={profileColorOpacity}
                profileDotsOpacity={profileDotsOpacity}
                profileCardRef={profileCardRef}
                profileHideOpacity={profileCardHide}
                profileIndex={CENTER_PROFILE_INDEX}
                exitProgress={profileExit}
                lite={isMobile}
              />
            </motion.div>

            <motion.div style={{ y: rightY, x: rightX, willChange: 'transform' }}>
              <ArtColumn images={RIGHT_COL} scale={framesScale} lite={isMobile} />
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
                alt="Andrew Jiang"
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                style={{ objectPosition: 'top center' }}
              />
              <ProfileHalftone waveFront={profileWaveFront} waveHeight={0.40} />
            </motion.div>
          </motion.div>



          {/* ── About — text panel ──────────────────────────────────────────── */}
          {/* Each child slides out from behind the profile photo in staggered   */}
          {/* order, creating a hierarchy cascade effect.                        */}
          <motion.div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: isMobile ? '100%' : '65%',
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              // Mobile: anchor content directly below the photo — centring
              // would float it down and open a gap under the portrait.
              justifyContent: isMobile ? 'flex-start' : 'center',
              paddingLeft: '6vw',
              paddingRight: isMobile ? '6vw' : '4vw',
              // Clear the top-centre photo (104px offset + 78vw × 1.05 aspect),
              // with room for the heading's wave bob (letters rise ~20px)
              paddingTop: isMobile ? 'calc(104px + 82vw + 26px)' : 0,
              background: 'transparent',
              opacity: panelOpacity,
              zIndex: 2,
              overflow: 'hidden',
            }}
          >
            {/* 2 — Heading (second out) */}
            <motion.div
              style={{
                marginBottom: isMobile ? '14px' : '28px',
                x: headingX,
                opacity: headingO,
              }}
            >
              <ElasticHeading
                text="Hello! I'm Andrew."
                as="h2"
                style={{
                  fontFamily: "'EastBlue', 'Abril Fatface', serif",
                  fontSize: 'clamp(34px, 7vw, 96px)',
                  lineHeight: 0.95,
                  color: 'var(--color-cream)'
                }}
                className=""
                waveEffect={true}
              />
            </motion.div>

            {/* 3 — Primary bio quote (third out) */}
            <motion.p
              style={{
                fontFamily: "'Space Mono', monospace",
                fontSize: isMobile ? '12px' : '14px',
                lineHeight: isMobile ? 1.6 : 1.9,
                color: 'var(--color-cream)',
                marginBottom: '12px',
                x: bodyX,
                opacity: bodyO,
              }}
            >
              I&rsquo;m an aspiring software engineer based in New York,
              currently pursuing my BS in Computer Science at Queens College.
              Coming from an artistic background,I believe design can solve problems and improve how people interact with technology.
              My goal is to create digital experiences that are both functional and enjoyable.
            </motion.p>

            {/* 4 — Secondary bio (fourth out) — hidden on mobile, where the
                large reference-style portrait leaves room for one paragraph */}
            <motion.p
              style={{
                display: isMobile ? 'none' : 'block',
                fontFamily: "'Space Mono', monospace",
                fontSize: isMobile ? '12px' : '14px',
                lineHeight: isMobile ? 1.6 : 1.9,
                color: 'var(--color-cream)',
                marginBottom: isMobile ? '16px' : '28px',
                x: bioX,
                opacity: bioO,
              }}
            >
              When I'm not working on projects or building new applications, you can find me
              on a scenic hike, sketching in my notebook, or experimenting in the kitchen.
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

              {isMobile ? (
                // Infinite marquee — chips drift continuously; the list is
                // rendered twice so the -50% loop is seamless.
                <div style={{ overflow: 'hidden', paddingBottom: '4px' }}>
                  <div className="skill-marquee">
                    {[0, 1].map((copy) => (
                      <div
                        key={copy}
                        aria-hidden={copy === 1 || undefined}
                        style={{ display: 'flex', flexShrink: 0 }}
                      >
                        {[...MAIN_SKILLS, ...OTHER_SKILLS].map((skill, index) => (
                          <div key={skill.name} style={{ flexShrink: 0, marginRight: '10px' }}>
                            <SkillIcon skill={skill} index={index} progress={progress} isMain />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <>
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
                </>
              )}

              <motion.a
                href="/docs/resume.pdf"
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  x: resumeX,
                  opacity: resumeO,
                  marginTop: isMobile ? '16px' : '24px',
                  padding: '12px 40px',
                  // Mobile: full-width pill (reference "Follow" placement);
                  // desktop stays a left-aligned fit-content button
                  width: isMobile ? '100%' : undefined,
                  marginInline: isMobile ? 'auto' : undefined,
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

        {/* ── Section Label — outside the masked wrapper (the mask creates a
            stacking context) so its dropdown + blur overlay layer correctly ── */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-30">
          <SectionNav
            currentSection="About"
            style={{
              y: labelY,
              opacity: labelO,
            }}
            defaultTextColor="rgba(245,240,232,0.45)"
          />
        </div>
      </div>
    </motion.div>
  )
}
