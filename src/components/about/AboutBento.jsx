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
import { motion, useTransform, useMotionValueEvent, useReducedMotion } from 'framer-motion'
import SpotifyCard from './SpotifyCard'
import StatusTicker from './StatusTicker'
import DogPet from './DogPet'
import {
  TAGLINE_SEGMENTS, BIO_PARAGRAPHS, RESUME_URL, TECH_STACK, SOCIALS,
} from '../../data/aboutData'

// ── Tech-stack mini-bento mosaic ─────────────────────────────────────────────
// Icon — two stacked SVGs from /public/icons: white at rest, brand-colour on
// hover (CSS crossfades them per cell). `noWhite` items have no white/ variant
// yet, so their rest state is the colour svg forced white via a CSS filter.
function TechIcon({ name, noWhite }) {
  return (
    <>
      <img
        className="ab-mi ab-mi-rest"
        src={`/icons/${noWhite ? 'default' : 'white'}/${name}.svg`}
        style={noWhite ? { filter: 'brightness(0) invert(1)' } : undefined}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
      <img className="ab-mi ab-mi-color" src={`/icons/default/${name}.svg`} alt="" aria-hidden="true" draggable="false" />
    </>
  )
}

// Packed grid of rounded cells. Four are 2×2 anchors (the main stack at rest);
// clicking a small cell promotes it and demotes the longest-held anchor, so
// exactly four stay large. The whole field re-tiles in one Framer `layout`
// spring — gated to an instant cut under reduced-motion.
//
// Mobile: the tech tile is a small, scroll-panned cell, so the 2×2 reflow is
// dropped for a flat, uniform, non-interactive grid (the expand is a desktop
// delight). Cells render as <div> there instead of <button>.
function TechMosaic({ isMobile }) {
  const reduce = useReducedMotion()
  const [bigQueue, setBigQueue] = useState(() =>
    TECH_STACK.filter((it) => it.big).map((it) => it.id),
  )
  const bigSet = new Set(bigQueue)
  const promote = (id) =>
    setBigQueue((q) => (q.includes(id) ? q : [...q.slice(1), id]))

  const layoutTx = reduce
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 32 }

  const Cell = isMobile ? motion.div : motion.button

  return (
    <div className="ab-mosaic">
      {TECH_STACK.map((it) => {
        const isBig = !isMobile && bigSet.has(it.id)
        const interactiveProps = isMobile
          ? {}
          : { type: 'button', onClick: () => promote(it.id), 'aria-pressed': isBig }
        return (
          <Cell
            key={it.id}
            layout
            transition={{ layout: layoutTx }}
            aria-label={it.label}
            title={it.label}
            className={`ab-mcell${isBig ? ' ab-mcell--big' : ''}`}
            {...interactiveProps}
          >
            <motion.span layout className="ab-micon">
              <TechIcon name={it.id} noWhite={it.noWhite} />
            </motion.span>
          </Cell>
        )
      })}
    </div>
  )
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
                fontSize: 'clamp(2rem, 3.4vw, 7rem)',
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
                aria-label="Resume"
                className="icon-btn"
              >
                <div className="relative h-full w-full">
                  <img className="h-full w-full object-contain" src="/icons/components/resume.svg" alt="Resume" draggable="false" />
                </div>
              </a>
            </div>

            {isMobile ? <DogPet size={48} /> : <DogPet jumpScale={2.25} />}
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

        {/* ── Tech stack — mini-bento mosaic ───────────────────────────────── */}
        <Assemble progress={progress} start={0.52} area="ab-tech">
          <div className="ab-tile flex h-full w-full flex-col p-4 md:p-5">
            <p style={LABEL} className="mb-3 shrink-0">Tech Stack</p>
            <TechMosaic isMobile={isMobile} />
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
            <div className="flex flex-1 items-center justify-evenly">
              {SOCIALS.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={s.label}
                  className="icon-btn"
                >
                  <div className="relative h-full w-full">
                    <img className="icon-btn-img-rest" src={`/icons/white/${s.icon}.svg`} alt="" aria-hidden="true" draggable="false" />
                    <img className="icon-btn-img-color" src={`/icons/default/${s.icon}.svg`} alt="" aria-hidden="true" draggable="false" />
                  </div>
                </a>
              ))}
            </div>
          </div>
        </Assemble>

      </motion.div>
    </div>
  )
}
