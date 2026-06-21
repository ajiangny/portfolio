/**
 * AboutBento.jsx — About Section settled state (7-tile bento)
 *
 * Replaces the old text cascade. After the journey portrait flies in and lands
 * (About.jsx, progress ≈ 0.52), the profile tile crossfades the real photo over
 * the fading overlay (same rect → seamless) and the other six tiles assemble
 * around it with a staggered scroll-driven spring (opacity + rise + scale).
 *
 * Tiles (reference layout):
 *   tagline (+ resume)  ·  profile photo  ·  tech stack & hobbies (tall)
 *   about description   ·  status / spotify (stacked)  ·  socials
 *
 * The profile cell forwards `profileTileRef` so About.jsx can measure its rect
 * and aim the flying portrait at it. Tilt + pulse-ring live here now (the
 * overlay is just the flight vehicle).
 */
import { useState, useRef, useEffect } from 'react'
import { motion, useTransform, useMotionValueEvent } from 'framer-motion'
import StackIcon from '../LazyStackIcon'
import SpotifyCard from './SpotifyCard'
import StatusTicker from './StatusTicker'
import {
  TAGLINE_SEGMENTS, BIO_PARAGRAPHS, RESUME_URL, TECH_HOBBIES, SOCIALS,
} from '../../data/aboutData'

// ── Inline hobby glyphs (stroke) — tech glyphs come from tech-stack-icons ────
const HOBBY_ICONS = {
  hiking: 'm8 3 4 8 5-5 5 15H2L8 3z',
  sketch: 'M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z',
  reading:
    'M12 7v13M3 18a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z',
  cooking:
    'M6 13.87A4 4 0 0 1 7.41 6a5.11 5.11 0 0 1 1.05-1.54 5 5 0 0 1 7.08 0A5.11 5.11 0 0 1 16.59 6 4 4 0 0 1 18 13.87V21H6ZM6 17h12',
}

function HobbyGlyph({ name, className }) {
  if (name === 'gaming') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <line x1="6" y1="12" x2="10" y2="12" /><line x1="8" y1="10" x2="8" y2="14" />
        <line x1="15" y1="13" x2="15.01" y2="13" /><line x1="18" y1="11" x2="18.01" y2="11" />
        <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.544-.604-6.584-.685-7.258A4 4 0 0 0 17.32 5z" />
      </svg>
    )
  }
  if (name === 'film') {
    return (
      <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <path d="M7 3v18M17 3v18M3 7.5h4M3 12h4M3 16.5h4M17 7.5h4M17 12h4M17 16.5h4" />
      </svg>
    )
  }
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={HOBBY_ICONS[name]} />
    </svg>
  )
}

// ── Social glyphs (filled) ───────────────────────────────────────────────────
const SOCIAL_ICONS = {
  github:
    'M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z',
  linkedin:
    'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  instagram:
    'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.92-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
}

// ── Staggered assembly wrapper — transparent grid child, scroll-driven ───────
// Each tile WIPES UP into place (clip-path top inset 100%→0%, no fade), matching
// the gallery cards. At rest → 'none' so the tile's glass shadow isn't clipped.
const clamp01 = (v) => Math.max(0, Math.min(1, v))
const ASSEMBLE_SPAN = 0.05 // progress units for one tile's reveal wipe

function Assemble({ progress, start, area, children }) {
  const clipPath = useTransform(progress, (p) => {
    const t = clamp01((p - start) / ASSEMBLE_SPAN)
    return t >= 1 ? 'none' : `inset(${((1 - t) * 100).toFixed(2)}% 0% 0% 0%)`
  })
  return (
    <motion.div className={area} style={{ clipPath }}>
      {children}
    </motion.div>
  )
}

const LABEL = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700,
  fontSize: 'var(--text-label)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'rgba(245,240,232,0.45)',
}

export default function AboutBento({ progress, isMobile, profileTileRef }) {
  // Mobile only: the in-grid profile photo crossfades in as the flying overlay
  // fades out at landing, so the photo pans with the bento. Desktop keeps the
  // overlay as the settled card, leaving this grid cell an empty placeholder.
  const profileOpacity = useTransform(progress, [0.48, 0.51], [0, 1])

  // Disable pointer + keyboard on the tiles until they've assembled, so hidden
  // links aren't clickable/focusable during Hero and the portrait flight.
  const [interactive, setInteractive] = useState(false)
  useMotionValueEvent(progress, 'change', (p) => {
    const on = p > 0.52
    setInteractive((prev) => (prev === on ? prev : on))
  })

  // ── Mobile vertical pan ─────────────────────────────────────────────────────
  // The mobile bento is taller than the viewport; the leftover section scroll
  // pans it up so every tile is reachable. Overflow is measured (recomputed on
  // resize); pan holds at 0 while the portrait lands, then runs 0 → −overflow.
  const gridRef = useRef(null)
  const overflowRef = useRef(0)
  useEffect(() => {
    if (!isMobile) { overflowRef.current = 0; return }
    const compute = () => {
      const grid = gridRef.current
      if (!grid) return
      const avail = window.innerHeight - 112 // header pill + top/bottom clearance
      overflowRef.current = Math.max(0, grid.scrollHeight - avail)
    }
    compute()
    const raf = requestAnimationFrame(compute)
    const late = setTimeout(compute, 300)
    window.addEventListener('resize', compute)
    return () => {
      cancelAnimationFrame(raf)
      clearTimeout(late)
      window.removeEventListener('resize', compute)
    }
  }, [isMobile])

  const panY = useTransform(progress, (p) => {
    if (!isMobile) return 0
    const t = Math.max(0, Math.min(1, (p - 0.52) / 0.36))
    return -overflowRef.current * t
  })

  return (
    <div
      className={`pointer-events-none absolute inset-0 flex justify-center ${isMobile ? 'items-start' : 'items-center'}`}
      style={{ paddingTop: isMobile ? 96 : 104, paddingBottom: isMobile ? 16 : 32, zIndex: 4 }}
    >
      <motion.div
        ref={gridRef}
        className="about-bento pointer-events-auto"
        inert={interactive ? undefined : true}
        style={{ y: panY }}
      >

        {/* ── Tagline + resume ─────────────────────────────────────────────── */}
        <Assemble progress={progress} start={0.50} area="ab-tagline">
          <div className="ab-tile ab-tile-hover flex h-full w-full flex-col justify-between p-4 md:p-8">
            <p
              className="text-cream"
              style={{
                fontFamily: "'DM Sans', sans-serif",
                fontSize: 'clamp(1.4rem, 3.4vw, 7rem)',
                lineHeight: 1.04,
                letterSpacing: '-0.01em',
              }}
            >
              {TAGLINE_SEGMENTS.map((s, idx) => (
                <span key={idx}>
                  <span
                    style={{
                      fontWeight: s.weight,
                      fontStyle: s.italic ? 'italic' : 'normal',
                      fontFamily: s.italic ? 'Georgia, "Times New Roman", serif' : undefined,
                      color: s.weight >= 700 ? 'var(--color-cream)' : 'rgba(245,240,232,0.82)',
                    }}
                  >
                    {s.t}
                  </span>
                  {s.break ? <br /> : ' '}
                </span>
              ))}
            </p>

            <div className="flex justify-end">
              <a
                href={RESUME_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="group/cv inline-flex items-center gap-2 rounded-xl border border-[#f5f0e826] bg-white/5 px-4 py-2.5 transition-all duration-300 hover:-translate-y-0.5 hover:border-[#f5f0e866] hover:bg-white/80"
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 text-cream/75 transition-colors duration-300 group-hover/cv:text-cobalt" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <path d="M14 2v6h6M9 13h6M9 17h4" />
                </svg>
                <span className="font-sans text-xs font-bold uppercase tracking-[0.2em] text-cream/75 transition-colors duration-300 group-hover/cv:text-cobalt">
                  Resume
                </span>
              </a>
            </div>
          </div>
        </Assemble>

        {/* ── Profile photo — journey landing site ─────────────────────────── */}
        {/* Desktop: an empty placeholder; the flying overlay (About.jsx) settles */}
        {/* here as the card. Mobile: the photo lives in the grid so it pans.     */}
        <div className="ab-profile" ref={profileTileRef}>
          {isMobile && (
            <motion.div className="ab-tile relative h-full w-full" style={{ opacity: profileOpacity }}>
              <img
                src="/art/profile.webp"
                alt="Andrew Jiang"
                className="absolute inset-0 h-full w-full object-cover"
                style={{ objectPosition: 'top center' }}
              />
            </motion.div>
          )}
        </div>

        {/* ── Tech stack & hobbies ─────────────────────────────────────────── */}
        {/* Large, box-less icons floating on the glass (reference layout). */}
        <Assemble progress={progress} start={0.52} area="ab-tech">
          <div className="ab-tile flex h-full w-full flex-col p-5 md:p-7">
            <p style={LABEL} className="mb-4 md:mb-5">Tech Stack &amp; Hobbies</p>
            <div className="grid flex-1 grid-cols-3 place-items-center gap-x-4 gap-y-2" style={{ gridAutoRows: '1fr' }}>
              {TECH_HOBBIES.map((it) => (
                <div
                  key={it.label}
                  title={it.label}
                  className="group/icon flex items-center justify-center opacity-90 transition-all duration-300 hover:scale-110 hover:opacity-100"
                >
                  {it.kind === 'tech' ? (
                    <div className="h-10 w-10 md:h-[46px] md:w-[46px] [&_svg]:h-full [&_svg]:w-full">
                      <StackIcon name={it.icon} />
                    </div>
                  ) : (
                    <HobbyGlyph
                      name={it.icon}
                      className="h-9 w-9 text-cream/80 transition-colors duration-300 group-hover/icon:text-cream md:h-[42px] md:w-[42px]"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        </Assemble>

        {/* ── About description ────────────────────────────────────────────── */}
        <Assemble progress={progress} start={0.54} area="ab-about">
          <div className="ab-tile ab-tile-hover flex h-full w-full flex-col justify-start gap-2.5 p-5 md:p-6">
            <p style={LABEL}>About</p>
            {BIO_PARAGRAPHS.map((para, idx) => (
              <p
                key={idx}
                className="font-mono text-cream/75"
                style={{ fontSize: 'var(--text-body)', lineHeight: 1.65 }}
              >
                {para}
              </p>
            ))}
          </div>
        </Assemble>

        {/* ── Status (rotating) ────────────────────────────────────────────── */}
        <Assemble progress={progress} start={0.56} area="ab-status">
          <StatusTicker />
        </Assemble>

        {/* ── Spotify (custom player) ──────────────────────────────────────── */}
        <Assemble progress={progress} start={0.58} area="ab-spotify">
          <SpotifyCard />
        </Assemble>

        {/* ── Socials ──────────────────────────────────────────────────────── */}
        <Assemble progress={progress} start={0.60} area="ab-social">
          <div className="ab-tile ab-tile-hover flex h-full w-full flex-col justify-start gap-4 p-5 md:p-6">
            <p style={LABEL}>Socials</p>
            <div className="flex items-center gap-3">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-cream/70 transition-all duration-300 hover:-translate-y-1 hover:border-white/90 hover:bg-white/90 hover:text-cobalt"
                >
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path d={SOCIAL_ICONS[s.icon]} />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </Assemble>

      </motion.div>
    </div>
  )
}
