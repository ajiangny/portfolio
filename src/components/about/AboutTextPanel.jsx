/**
 * AboutTextPanel.jsx — About Section Text Cascade
 *
 * The heading / bio / skills / resume column that slides out from behind
 * the profile photo once it settles (About progress ≈ 0.505–0.5725).
 * Each child has its own slightly-offset progress window, creating a
 * staggered hierarchy cascade from behind the portrait.
 *
 * Layout adapts to the photo's resting spot:
 *   • Desktop — left 65% of the viewport, vertically centred beside the
 *     right-panel portrait; two bio paragraphs + wrapped skill tiles
 *   • Mobile  — full width below the top-centre portrait (paddingTop
 *     clears 104px offset + 78vw×1.05 photo); one bio paragraph and an
 *     infinite skills marquee (CSS .skill-marquee) instead of the grid
 *
 * The `pulse-glow` / `pulse-ring` keyframes used by the resume button
 * (and the photo overlay in About.jsx) live in index.css.
 */
import { motion, useTransform } from 'framer-motion'
import { MAIN_SKILLS, OTHER_SKILLS } from '../../data/aboutData'
import ElasticHeading from '../hero/ElasticHeading'
import SkillIcon from './SkillIcon'

export default function AboutTextPanel({ progress, isMobile }) {
  // Text reveals start at ~0.505, while the centred portrait is gliding
  // to its resting spot (photo journey ends at 0.52 — see About.jsx).
  const panelOpacity = useTransform(progress, [0.504, 0.5125], [0, 1])

  const headingX = useTransform(progress, [0.514, 0.5525], ['68vw', '0vw'])
  const bodyX = useTransform(progress, [0.523, 0.5575], ['68vw', '0vw'])
  const bioX = useTransform(progress, [0.53, 0.5625], ['68vw', '0vw'])
  const skillsX = useTransform(progress, [0.537, 0.5675], ['68vw', '0vw'])

  const headingO = useTransform(progress, [0.514, 0.5325], [0, 1])
  const bodyO = useTransform(progress, [0.523, 0.54], [0, 1])
  const bioO = useTransform(progress, [0.53, 0.546], [0, 1])
  const skillsO = useTransform(progress, [0.537, 0.5525], [0, 1])
  const resumeX = useTransform(progress, [0.544, 0.5725], ['68vw', '0vw'])
  const resumeO = useTransform(progress, [0.544, 0.5595], [0, 1])

  return (
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
        Coming from an artistic background, I believe design can solve problems and improve how people interact with technology.
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
  )
}
