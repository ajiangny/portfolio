/**
 * AboutBento.tsx — About Section settled state (7-tile bento)
 *
 * Replaces the old text cascade. After the journey portrait flies in and lands
 * (About.tsx, progress ≈ 0.52), the profile tile crossfades the real photo over
 * the fading overlay (same rect → seamless) and the other six tiles assemble
 * around it with a staggered scroll-driven spring (opacity + rise + scale).
 *
 * Tiles (reference layout):
 *   tagline (+ resume)  ·  profile photo  ·  tech stack & hobbies (tall)
 *   about description   ·  status / spotify (stacked)  ·  socials
 *
 * The profile cell forwards `profileTileRef` so About.tsx can measure its rect
 * and aim the flying portrait at it. Tilt + pulse-ring live here now (the
 * overlay is just the flight vehicle).
 */
import {
  useState, useRef, useEffect, useMemo,
  type CSSProperties, type ReactNode, type RefObject,
} from 'react'
import {
  motion, useTransform, useMotionValueEvent, useReducedMotion,
  type MotionValue, type Transition,
} from 'framer-motion'
import useInkFilter from '../../hooks/useInkFilter'
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
function TechIcon({ name, noWhite }: { name: string; noWhite?: boolean }) {
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

const TECH_SWAP_MS = 4200

// Packed grid of rounded cells. Four are 2×2 anchors (the main stack at rest).
// `queue` is a full least-→most-recently-used ordering of every cell; the
// last four are the big anchors. Clicking a small cell promotes it (moves it
// to the back), bumping the front of the big window back out to small. A
// timer does the same thing automatically — it promotes whichever cell is
// currently at the FRONT of the queue (the overall least-recently-used one,
// which is always small since the big four occupy the back), so the
// longest-held anchor keeps rotating out for the icon that's gone longest
// without a turn. Paused on hover; off on mobile (flat, non-interactive
// grid) and under reduced-motion. The whole field re-tiles in one Framer
// `layout` spring — gated to an instant cut under reduced-motion.
//
// Mobile: the tech tile is a small, scroll-panned cell, so the 2×2 reflow is
// dropped for a flat, uniform, non-interactive grid (the expand is a desktop
// delight). Cells render as <div> there instead of <button>.
function TechMosaic({ isMobile }: { isMobile: boolean }) {
  const reduce = useReducedMotion()
  const [queue, setQueue] = useState(() => [
    ...TECH_STACK.filter((it) => !it.big).map((it) => it.id),
    ...TECH_STACK.filter((it) => it.big).map((it) => it.id),
  ])
  const bigSet = new Set(queue.slice(-4))
  const promote = (id: string) =>
    setQueue((q) => (q[q.length - 1] === id ? q : [...q.filter((x) => x !== id), id]))

  const pausedRef = useRef(false)
  useEffect(() => {
    if (isMobile || reduce) return
    const id = setInterval(() => {
      if (!pausedRef.current) setQueue((q) => [...q.slice(1), q[0]])
    }, TECH_SWAP_MS)
    return () => clearInterval(id)
  }, [isMobile, reduce])

  const layoutTx: Transition = reduce
    ? { duration: 0 }
    : { type: 'spring', stiffness: 300, damping: 32 }

  // Mobile renders inert <div> cells; desktop gets clickable <button>s. The two
  // motion components share the props we pass, so one button-typed alias keeps
  // the JSX below monomorphic for TS.
  const Cell = (isMobile ? motion.div : motion.button) as typeof motion.button

  // Big cells first so the 4×4 block (rows 1–4) always fills completely;
  // small cells fill rows 5–6. Any mix of 4 big + 8 small tiles hole-free.
  const sortedStack = useMemo(
    () => [...TECH_STACK].sort((a, b) => (bigSet.has(b.id) ? 1 : 0) - (bigSet.has(a.id) ? 1 : 0)),
    [queue], // eslint-disable-line react-hooks/exhaustive-deps
  )

  return (
    <div
      className="ab-mosaic"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {sortedStack.map((it) => {
        const isBig = !isMobile && bigSet.has(it.id)
        return (
          <Cell
            key={it.id}
            layout
            transition={{ layout: layoutTx }}
            aria-label={it.label}
            data-cursor-label={it.label}
            className={`ab-mcell${isBig ? ' ab-mcell--big' : ''}`}
            type={isMobile ? undefined : 'button'}
            onClick={isMobile ? undefined : () => promote(it.id)}
            aria-pressed={isMobile ? undefined : isBig}
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


// ── Typewriter — reveals BIO_PARAGRAPHS over ghost text once isActive fires ───
// The full text is always rendered at ghost opacity; charCount advances the
// opaque "revealed" portion left-to-right so layout never reflows. A ref on the
// leading ghost span keeps the frontier scrolled into view. Skips animation
// under reduced motion.
interface TypewriterBioProps {
  paragraphs: string[]
  isActive: boolean
  skip: boolean | null
}

function TypewriterBio({ paragraphs, isActive, skip }: TypewriterBioProps) {
  const totalLen = paragraphs.reduce((n, p) => n + p.length + 2, 0)
  const [charCount, setCharCount] = useState(skip ? totalLen : 0)
  const [done, setDone] = useState(!!skip)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const frontierRef = useRef<HTMLSpanElement | null>(null)
  const userScrolledUpRef = useRef(false)

  useEffect(() => {
    if (!isActive || done || skip) return
    const id = setInterval(() => {
      setCharCount((prev) => {
        const next = Math.min(prev + 1, totalLen)
        if (next >= totalLen) setDone(true)
        return next
      })
    }, 50)
    return () => clearInterval(id)
  }, [isActive, done, skip, totalLen])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const onScroll = () => {
      userScrolledUpRef.current = el.scrollHeight - el.scrollTop - el.clientHeight > 40
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  // Scroll just enough to keep the reveal frontier visible
  useEffect(() => {
    const container = scrollRef.current
    const frontier = frontierRef.current
    if (!container || !frontier || userScrolledUpRef.current) return
    const cRect = frontier.getBoundingClientRect()
    const pRect = container.getBoundingClientRect()
    if (cRect.bottom > pRect.bottom) {
      container.scrollTop += cRect.bottom - pRect.bottom + 8
    }
  }, [charCount])

  // Split each paragraph into revealed / ghost at charCount
  const chunks: { revealed: string; ghost: string; isFrontier: boolean }[] = []
  let offset = 0
  for (const para of paragraphs) {
    const start = offset
    offset += para.length + 2 // +2 for the \n\n separator
    const revealEnd = Math.max(0, Math.min(para.length, charCount - start))
    chunks.push({
      revealed: para.slice(0, revealEnd),
      ghost: para.slice(revealEnd),
      isFrontier: charCount > start && charCount < start + para.length,
    })
  }

  return (
    <div
      ref={scrollRef}
      data-lenis-prevent
      className="ab-about-scroll flex flex-1 min-h-0 flex-col gap-2.5 overflow-y-auto"
    >
      {chunks.map(({ revealed, ghost, isFrontier }, idx) => (
        <p
          key={idx}
          className="font-mono"
          style={{ fontSize: 'var(--text-body)', lineHeight: 1.65 }}
        >
          <span style={{ color: 'rgba(255,255,255,0.75)' }}>{revealed}</span>
          {ghost && (
            <span
              ref={isFrontier ? frontierRef : undefined}
              style={{ color: 'rgba(255,255,255,0.15)' }}
            >
              {ghost}
            </span>
          )}
        </p>
      ))}
    </div>
  )
}

// ── Staggered assembly wrapper — transparent grid child, scroll-driven ───────
// Each tile INK-DISSOLVES into place (shared InkDissolve filter: opacity leads,
// turbulence displacement + blur settle to 0 across the window), matching the
// gallery cards. The filter drops to 'none' at rest, restoring the tiles'
// glass backdrop-blur once settled.
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))
const ASSEMBLE_SPAN = 0.05 // progress units for one tile's reveal dissolve

interface AssembleProps {
  progress: MotionValue<number>
  start: number
  area: string
  children: ReactNode
}

function Assemble({ progress, start, area, children }: AssembleProps) {
  const reduce = useReducedMotion()
  const t = useTransform(progress, (p) => clamp01((p - start) / ASSEMBLE_SPAN))
  const { defs, filter } = useInkFilter(t, { maxScale: 50, maxBlur: 8, octaves: 3 })
  const opacity = useTransform(t, [0, 0.3], [0, 1])
  return (
    <motion.div className={area} style={{ opacity, filter: reduce ? 'none' : filter }}>
      {defs}
      {children}
    </motion.div>
  )
}

const LABEL: CSSProperties = {
  fontFamily: "'DM Sans', sans-serif",
  fontWeight: 700,
  fontSize: 'var(--text-label)',
  letterSpacing: '0.22em',
  textTransform: 'uppercase',
  color: 'rgba(255,255,255,0.45)',
}

export interface AboutBentoProps {
  progress: MotionValue<number>
  isMobile: boolean
  profileTileRef: RefObject<HTMLDivElement | null>
}

export default function AboutBento({ progress, isMobile, profileTileRef }: AboutBentoProps) {
  const reduceMotion = useReducedMotion()

  // Mobile only: the in-grid profile photo crossfades in as the flying overlay
  // fades out at landing, so the photo pans with the bento. Desktop keeps the
  // overlay as the settled card, leaving this grid cell an empty placeholder.
  const profileOpacity = useTransform(progress, (v) => v >= 0.48 ? 1 : 0)
  // The overlay (About.jsx) carries its own border during the flight/fade. Keep
  // the in-grid tile border transparent while the overlay is still visible, then
  // fade it in once the overlay is fully gone — prevents two 0.18-alpha borders
  // stacking to ~0.33 and flashing brighter than every other tile.
  const profileBorderColor = useTransform(
    progress,
    [0.51, 0.53],
    ['rgba(255,255,255,0)', 'rgba(255,255,255,0.18)'],
  )

  // Disable pointer + keyboard on the tiles until they've assembled, so hidden
  // links aren't clickable/focusable during Hero and the portrait flight.
  const [interactive, setInteractive] = useState(false)
  // Fire the typewriter as soon as the About tile starts its dissolve-in (p > 0.54).
  const [bioActive, setBioActive] = useState(false)
  // The resume icon self-draws via SVG SMIL, which (like the Spotify play
  // button) only ever plays on its FIRST decode of a given URL — mounted this
  // early, it would otherwise finish and freeze long before the tile scrolls
  // into view. Gate it behind the same tagline reveal threshold and mint a
  // fresh cache-busting token so it draws when the user actually sees it.
  const [resumeRevealed, setResumeRevealed] = useState(false)
  const [resumeToken, setResumeToken] = useState('resume-0')
  useMotionValueEvent(progress, 'change', (p) => {
    const on = p > 0.52
    setInteractive((prev) => (prev === on ? prev : on))
    if (!bioActive && p > 0.54) setBioActive(true)
    if (!resumeRevealed && p > 0.52) {
      setResumeRevealed(true)
      setResumeToken(`resume-${Math.round(performance.now())}`)
    }
  })

  // ── Mobile vertical pan ─────────────────────────────────────────────────────
  // The mobile bento is taller than the viewport; the leftover section scroll
  // pans it up so every tile is reachable. Overflow is measured (recomputed on
  // resize); pan holds at 0 while the portrait lands, then runs 0 → −overflow.
  const gridRef = useRef<HTMLDivElement | null>(null)
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

  // Cache-busted so the resume icon's SMIL self-draw replays fresh once the
  // tagline tile is actually visible (mirrors SpotifyCard's play-button reveal).
  const resumeBtn = (
    <a
      href={RESUME_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Resume"
      data-cursor-label="Resume"
      className="icon-btn"
    >
      <div className="relative h-full w-full">
        <img
          key={resumeToken}
          className="h-full w-full object-contain"
          src={`/icons/components/resume.svg?v=${resumeToken}`}
          alt="Resume"
          draggable="false"
          style={{
            opacity: resumeRevealed ? 1 : 0,
            transition: reduceMotion ? undefined : 'opacity 0.2s ease',
          }}
        />
      </div>
    </a>
  )

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
                fontSize: isMobile ? 'clamp(1rem, 5vw, 1.5rem)' : 'clamp(2rem, 3.4vw, 7rem)',
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
                      color: s.weight >= 700 ? 'var(--color-cream)' : 'rgba(255,255,255,0.82)',
                    }}
                  >
                    {s.t}
                  </span>
                  {s.break && !isMobile ? <br /> : ' '}
                </span>
              ))}
            </p>

            {isMobile ? (
              <>
                <div className="flex justify-end">{resumeBtn}</div>
                <DogPet size={100} />
              </>
            ) : (
              <>
                <div className="flex justify-end">{resumeBtn}</div>
                <DogPet jumpScale={2.25} />
              </>
            )}
          </div>
        </Assemble>

        {/* ── Profile photo — journey landing site ─────────────────────────── */}
        {/* Desktop: an empty placeholder; the flying overlay (About.jsx) settles */}
        {/* here as the card. Mobile: the photo lives in the grid so it pans.     */}
        <div className="ab-profile" ref={profileTileRef} style={isMobile ? undefined : { pointerEvents: 'none' }}>
          {isMobile && (
            <motion.div className="ab-tile relative h-full w-full" style={{ opacity: profileOpacity, borderColor: profileBorderColor }}>
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
          <div className="ab-tile ab-tile-hover flex h-full w-full flex-col p-4 md:p-5">
            <p style={LABEL} className="mb-3 shrink-0">Tech Stack</p>
            <TechMosaic isMobile={isMobile} />
          </div>
        </Assemble>

        {/* ── About description ────────────────────────────────────────────── */}
        <Assemble progress={progress} start={0.54} area="ab-about">
          <div className="ab-tile ab-tile-hover flex h-full w-full flex-col gap-2.5 p-5 md:p-6">
            <p style={LABEL} className="shrink-0">About</p>
            <TypewriterBio paragraphs={BIO_PARAGRAPHS} isActive={bioActive} skip={reduceMotion} />
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
                  data-cursor-label={s.label}
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
