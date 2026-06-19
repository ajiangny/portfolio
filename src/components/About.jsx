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
 *   Content fades via a CSS mask gradient, revealing the site-wide fluid
 *   gradient as it crossfades cobalt→cream into the Projects section.
 */
import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useMotionValueEvent, useSpring } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import { LEFT_COL, CENTER_COL, CENTER_PROFILE_INDEX, RIGHT_COL } from '../data/aboutData'
import ArtColumn from './about/ArtColumn'
import AboutTextPanel from './about/AboutTextPanel'

// ─── SVG Gradient Map (neutral grayscale duotone) ─────────────────────────────
// Endpoints are equal across R/G/B, so this is a neutral grayscale map (no
// colour cast) with the shadows lifted and highlights held — a soft mono look.
function DuotoneDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute', overflow: 'hidden' }}>
      <defs>
        <filter id="duotone-art" colorInterpolationFilters="sRGB">
          <feColorMatrix type="saturate" values="0" result="gray" />
          <feComponentTransfer colorInterpolationFilters="sRGB">
            <feFuncR type="table" tableValues="0.15 0.96" />
            <feFuncG type="table" tableValues="0.15 0.96" />
            <feFuncB type="table" tableValues="0.15 0.96" />
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
  // Separate clock for the Hero→About handoff — runs while `progress` is
  // still clamped at 0 (i.e. before the sticky viewport pins).
  const introProgress = useMotionValue(0)
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
        // Hero→About handoff clock — starts at 20% into the Hero's exit
        // (0.8vh BEFORE `progress` leaves 0) so the blank strips can fall
        // while the blue section is still sliding up over the Hero.
        // Spans 1.25vh of scroll: 1 lands at About progress 0.075, where
        // the filmstrip entry used to finish.
        const introRaw = (scroll - (el.offsetTop - vh * 0.8)) / (vh * 1.25)
        introProgress.set(Math.max(0, Math.min(1, introRaw)))
      }
      const onScroll = ({ scroll }) => calc(scroll)
      calc(lenis.scroll ?? window.scrollY)
      lenis.on('scroll', onScroll)
      unlisten = () => lenis.off('scroll', onScroll)
    }, 0)
    return () => { clearTimeout(t); unlisten() }
  }, [lenisRef, progress, introProgress])

  // ── Scroll-phase transforms ───────────────────────────────────────────────
  // Re-mapped so everything finishes at progress = 0.5 (which is 300vh)

  // Intro choreography rides introProgress (see the Lenis listener):
  //   0    → 20% into the Hero's exit; blank strips appear at the top
  //   0.31 → the blanks' bottom row has dropped below the viewport, so
  //          the art columns start rising to chase it (they break into
  //          view at ≈0.42 while the upper blank rows are still falling)
  //   0.72 → filmstrip fully risen; blanks have faded out by 0.70
  const colsEntryY = useTransform(introProgress, [0.31, 0.72], ['100vh', '0vh'])
  const framesScale = useTransform(introProgress, [0.31, 0.78], [0.60, 1])

  // Distant blank strips — small, light placeholders that fall down
  // through the cobalt opening before the real filmstrip rises in,
  // selling the "falling from a distance" depth as the section opens.
  const miniY = useTransform(introProgress, [0, 0.7], ['-90vh', '107vh'])
  const miniO = useTransform(introProgress, [0, 0.06, 0.62, 0.7], [0, 1, 1, 0])

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
  const profileGlassOpacity = useTransform(progress, [0.255, 0.3075], [1, 0])
  // The expanding overlay takes over at 0.31 — hide the filmstrip's own
  // profile card right then so the two never double up.
  const profileCardHide = useTransform(progress, [0.31, 0.318], [1, 0])

  // Gradient fade out from bottom to top. The fade only runs 0.85→1.0; below
  // that the mask is fully opaque (a no-op). We return 'none' there instead of
  // an opaque mask so the wrapper stops being a CSS "backdrop root" during the
  // filmstrip — otherwise it walls the cards off from the fixed gradient canvas
  // and their liquid-glass backdrop-filter has nothing to sample. The 0.8/0.85
  // handoff is seamless: both states are fully visible (no fade) at that point.
  const maskImage = useTransform(progress, (p) => {
    if (p < 0.8) return 'none'
    const t = Math.min(1, Math.max(0, (p - 0.85) / 0.15))
    const stop1 = -100 + t * 200 // 0.85→1.0 : -100% → 100%
    const stop2 = t * 200        // 0.85→1.0 :    0% → 200%
    return `linear-gradient(to top, transparent ${stop1}%, black ${stop2}%)`
  })

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
    if (v < 0.37) cur = lerpRect(start, center, ease(Math.max(0, (v - 0.31) / 0.06)))
    else if (v < 0.45) cur = center
    else if (v < 0.52) cur = lerpRect(center, final, ease((v - 0.45) / 0.07))
    else cur = final

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
      style={{ height: '700vh', backgroundColor: 'transparent' }}
    >

      <DuotoneDefs />

      <div className="sticky top-0 overflow-hidden" style={{ height: '100vh' }}>
        <motion.div style={{ WebkitMaskImage: maskImage, maskImage, width: '100%', height: '100%' }}>
          {/* ── Distant strips — depth cue ahead of the filmstrip ──────────── */}
          <motion.div
            className="absolute inset-0 grid grid-cols-3 gap-4 px-[16vw] md:gap-6 md:px-[30vw]"
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
                profileGlassOpacity={profileGlassOpacity}
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
            </motion.div>
          </motion.div>



          {/* ── About — text panel ──────────────────────────────────────────── */}
          {/* Heading/bio/skills/resume cascade — slides out from behind the    */}
          {/* profile photo. Lives in about/AboutTextPanel.jsx.                 */}
          <AboutTextPanel progress={progress} isMobile={isMobile} />
        </motion.div>

      </div>
    </motion.div>
  )
}
