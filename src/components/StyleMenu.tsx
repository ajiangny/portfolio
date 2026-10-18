/**
 * StyleMenu.tsx — Full-screen "game menu" navigation
 *
 * A Persona-5-inspired menu rebuilt in this site's own language (cobalt /
 * white / ink, Nevera + DM Sans + Plex Mono). It is not a copy of the game's
 * menu; it isolates the techniques that make that menu feel the way it does:
 *
 *   1. Three-colour palette, flat fills, no soft gradients   → MENU tokens
 *   2. A tilted axis: the whole list rotates, items stair-step
 *      along a diagonal instead of stacking on a vertical    → LIST_TILT, STEP_X
 *   3. Nothing is a rectangle: every surface is a jittered
 *      quad from clip-path, seeded so it's stable per item    → jagged()
 *   4. Selection is a costume change, not a hover tint: a
 *      two-layer slab (ink shadow + white face) springs to
 *      the item, text inverts, and the label re-sets as
 *      ransom-note letters                                    → Highlight, Ransom
 *   5. Motion is fast and overshoots, then holds still        → SNAP, ENTER_EASE
 *   6. Keyboard-first like a game: arrows move, Enter
 *      confirms, Esc backs out                                → onKeyDown
 *
 * Shapes, colours and motion come from style/riot.ts. It is the expanded
 * form of the site nav: the header monogram opens it (via menuSignal), as
 * does the M key. The header's inline links are the compact shortcut form. Choosing an item closes the menu and
 * runs the normal goToSection() ink-dissolve transition.
 *
 * z-index 9000: above the SiteHeader (200), below the PageTransition veil and
 * Cursor (9999) so the dissolve still covers the menu as it leaves.
 */
import { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import { useLenisContext } from '../context/LenisContext'
import { SECTIONS, goToSection } from '../config/sections'
import { RIOT, SNAP, ENTER_EASE, WIPE_EASE, jagged } from '../style/riot'
import Ransom from './style/Ransom'
import { onMenuOpen } from './style/menuSignal'

// ── 1. Palette — three flat colours, every element uses exactly one ──
const MENU = { field: RIOT.cobalt, face: RIOT.face, ink: RIOT.ink }

// ── 2. Composition — one tilted axis for the whole list ──
const LIST_TILT = -9 // deg; the list's baseline (steeper than the site's TILT)
const STEP_X = 5     // vw each item shifts right of the one above it

// ── 4a. Highlight slab — ink shadow offset behind a white face ──
function Highlight({ seed }: { seed: number }) {
  return (
    <motion.span
      layoutId="style-menu-highlight"
      transition={SNAP}
      aria-hidden
      style={{ position: 'absolute', inset: '-0.12em -0.6em', zIndex: 0 }}
    >
      <span
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'translate(0.18em, 0.14em) skewX(-14deg)',
          background: MENU.ink,
          clipPath: jagged(seed * 7 + 1, 8),
        }}
      />
      <span
        style={{
          position: 'absolute',
          inset: 0,
          transform: 'skewX(-14deg)',
          background: MENU.face,
          clipPath: jagged(seed * 7 + 2, 8),
        }}
      />
    </motion.span>
  )
}

export default function StyleMenu() {
  const { navigate } = useTransitionContext()
  const lenisRef = useLenisContext()
  const reduce = useReducedMotion()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  // Re-rolled on every selection change so the ransom letters re-shuffle.
  const [roll, setRoll] = useState(1)

  const select = useCallback((i: number) => {
    const next = (i + SECTIONS.length) % SECTIONS.length
    if (next === active) return
    setActive(next)
    setRoll((r) => r + 1)
  }, [active])

  const confirm = useCallback(
    (i: number) => {
      setOpen(false)
      goToSection(navigate, SECTIONS[i].id)
    },
    [navigate],
  )

  // Freeze page scroll while the menu owns the screen.
  useEffect(() => {
    const lenis = lenisRef?.current
    if (!lenis) return
    if (open) lenis.stop()
    else lenis.start()
  }, [open, lenisRef])

  // The header monogram (mobile) opens the menu through menuSignal.
  useEffect(() => onMenuOpen(() => setOpen(true)), [])

  // ── 6. Keyboard-first controls ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement)?.closest('input, textarea, [contenteditable]')
      if (typing) return
      if (!open) {
        if (e.key === 'm' || e.key === 'M') setOpen(true)
        return
      }
      if (e.key === 'Escape') setOpen(false)
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); select(active + 1) }
      else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); select(active - 1) }
      else if (e.key === 'Enter') { e.preventDefault(); confirm(active) }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, active, select, confirm])

  return (
    <>

      <AnimatePresence>
        {open && (
          <motion.nav
            key="style-menu"
            aria-label="Site menu"
            // Entrance: a diagonal sliver that slashes open to fill the screen.
            initial={{ clipPath: 'polygon(0% 100%, 0% 100%, 0% 100%, 0% 100%)' }}
            animate={{ clipPath: 'polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)' }}
            exit={{ clipPath: 'polygon(100% 0%, 100% 0%, 100% 0%, 100% 0%)' }}
            transition={{ duration: reduce ? 0 : 0.32, ease: WIPE_EASE }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9000,
              background: MENU.field,
              overflow: 'hidden',
            }}
          >
            {/* Background layer: halftone dots in a tilted band, plus a slow ink slash.
                Depth comes from flat layers stacked, not from blur or shading. */}
            <div
              aria-hidden
              style={{
                position: 'absolute',
                inset: '-20%',
                rotate: `${LIST_TILT}deg`,
                backgroundImage: 'radial-gradient(rgba(255,255,255,0.16) 1.6px, transparent 1.8px)',
                backgroundSize: '14px 14px',
                maskImage: 'linear-gradient(90deg, transparent 15%, #000 45%, #000 70%, transparent 95%)',
                WebkitMaskImage: 'linear-gradient(90deg, transparent 15%, #000 45%, #000 70%, transparent 95%)',
              }}
            />
            <motion.div
              aria-hidden
              initial={{ x: '-110%' }}
              animate={{ x: '0%' }}
              transition={{ duration: reduce ? 0 : 0.5, ease: ENTER_EASE, delay: 0.05 }}
              style={{
                position: 'absolute',
                left: '-10%',
                top: '58%',
                width: '130%',
                height: '26vh',
                rotate: `${LIST_TILT}deg`,
                background: MENU.ink,
                clipPath: jagged(11, 4),
              }}
            />

            {/* Title stamp — big, cropped by the viewport on purpose */}
            <motion.div
              aria-hidden
              initial={{ x: 80, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ ...SNAP, delay: 0.1 }}
              className="font-display"
              style={{
                position: 'absolute',
                right: '-2vw',
                top: '-3vw',
                rotate: `${-LIST_TILT}deg`,
                fontSize: 'clamp(5rem, 22vw, 22rem)',
                lineHeight: 0.8,
                color: 'transparent',
                WebkitTextStroke: '2px rgba(255,255,255,0.35)',
                userSelect: 'none',
              }}
            >
              MENU
            </motion.div>

            {/* The list — one rotated axis, items stair-stepped along it */}
            <ul
              style={{
                position: 'absolute',
                left: '8vw',
                top: '50%',
                translate: '0 -50%',
                rotate: `${LIST_TILT}deg`,
                listStyle: 'none',
                margin: 0,
                padding: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 'clamp(0.4rem, 1.6vh, 1.2rem)',
              }}
            >
              {SECTIONS.map((s, i) => {
                const isActive = i === active
                return (
                  <motion.li
                    key={s.id}
                    initial={{ x: '60vw', skewX: -30, opacity: 0 }}
                    animate={{ x: `${i * STEP_X}vw`, skewX: 0, opacity: 1 }}
                    exit={{ x: '-40vw', opacity: 0, transition: { duration: 0.15, delay: i * 0.02 } }}
                    transition={{ duration: reduce ? 0 : 0.45, ease: ENTER_EASE, delay: 0.08 + i * 0.045 }}
                  >
                    <button
                      type="button"
                      onClick={() => confirm(i)}
                      onMouseEnter={() => select(i)}
                      onFocus={() => select(i)}
                      aria-current={isActive ? 'true' : undefined}
                      aria-label={s.label}
                      style={{
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'baseline',
                        gap: '0.4em',
                        background: 'none',
                        border: 'none',
                        padding: '0.05em 0.2em',
                        cursor: 'pointer',
                        fontSize: 'clamp(2.25rem, 7vw, 6.5rem)',
                        lineHeight: 1,
                        outline: 'none',
                      }}
                    >
                      {isActive && <Highlight seed={i + 1} />}
                      <span
                        className="font-mono"
                        style={{
                          position: 'relative',
                          zIndex: 1,
                          fontSize: '0.22em',
                          fontWeight: 700,
                          color: isActive ? MENU.ink : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {String(i + 1).padStart(2, '0')}
                      </span>
                      <motion.span
                        animate={{ scale: isActive ? 1.08 : 1 }}
                        transition={SNAP}
                        style={{ position: 'relative', zIndex: 1, display: 'inline-block', originX: 0 }}
                      >
                        {isActive ? (
                          <Ransom text={s.label.toUpperCase()} seed={roll * 31 + i} color={MENU.field} />
                        ) : (
                          <span
                            className="font-display"
                            style={{
                              color: MENU.face,
                              // Idle items still carry the ink offset, so the
                              // layering reads even before anything is selected.
                              textShadow: `0.05em 0.05em 0 ${MENU.ink}`,
                            }}
                          >
                            {s.label.toUpperCase()}
                          </span>
                        )}
                      </motion.span>
                    </button>
                  </motion.li>
                )
              })}
            </ul>

            {/* Control hints — the game's "button prompt" strip */}
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ ...SNAP, delay: 0.3 }}
              className="font-mono uppercase"
              style={{
                position: 'absolute',
                right: '4vw',
                bottom: '4vh',
                rotate: `${LIST_TILT / 2}deg`,
                display: 'flex',
                gap: 18,
                fontSize: 'var(--text-label)',
                letterSpacing: '0.14em',
                color: MENU.face,
              }}
            >
              <span>↑↓ Select</span>
              <span>⏎ Go</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="font-mono uppercase"
                style={{
                  background: MENU.face,
                  color: MENU.field,
                  border: 'none',
                  padding: '2px 10px',
                  font: 'inherit',
                  letterSpacing: 'inherit',
                  cursor: 'pointer',
                  clipPath: jagged(5, 12),
                }}
              >
                Esc Close
              </button>
            </motion.div>
          </motion.nav>
        )}
      </AnimatePresence>
    </>
  )
}
