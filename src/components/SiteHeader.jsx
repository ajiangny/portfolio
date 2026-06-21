/**
 * SiteHeader.jsx — Global Morphing Navigation Header
 *
 * One header for the whole site (rendered in App.jsx, fixed, z-200, below the
 * PageTransition curtain). Expanded = AJ monogram (left) + equal links
 * (about/projects/gallery/contact, right). It collapses smoothly to a monogram
 * pill while crossing section seams (useActiveSection) and re-expands when a
 * section is centred. Glass + text colours adapt to the active section's
 * themeRgb. Hovering a link previews that section's palette in the fluid
 * gradient (gated to Hero inside FluidGradient). On mobile it stays a monogram
 * pill that opens a dropdown.
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence, useReducedMotion, useAnimation } from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import { SECTIONS, NAV_SECTIONS, goToSection } from '../config/sections'
import useMediaQuery from '../hooks/useMediaQuery'
import useActiveSection from '../hooks/useActiveSection'
import { setHoverSection } from './gradient/hoverSignal'
import { SECTION_PALETTES } from './gradient/gradientConfig'

const GUTTER = 40      // px viewport inset at each side when expanded
const MAX_W = 2200     // px expanded pill cap (stays wide on 2560+ monitors)
const BAR_H = 46       // px pill height (collapsed width == height → circle)
const LOGO = '/favicon/logo.svg'

// Perceived luminance of a normalised (0..1) rgb triple. The header sits at the
// top of the viewport, so we read the gradient's TOP base colour (base[0]) for
// the section behind it — that's the real background, which can differ from a
// section's themeRgb (e.g. Contact: cream themeRgb but a near-black gradient).
const lum = ([r, g, b]) => 0.299 * r + 0.587 * g + 0.114 * b
const isLightSection = (id) => lum((SECTION_PALETTES[id] ?? SECTION_PALETTES.hero).base[0]) > 0.6

export default function SiteHeader() {
  const { navigate } = useTransitionContext()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const reduce = useReducedMotion()
  const { index, settled } = useActiveSection()

  // Expanded pill width tracks the viewport (minus gutters), capped at MAX_W.
  const [expandedW, setExpandedW] = useState(MAX_W)
  useEffect(() => {
    const calc = () => setExpandedW(Math.min(window.innerWidth - GUTTER * 2, MAX_W))
    calc()
    window.addEventListener('resize', calc)
    return () => window.removeEventListener('resize', calc)
  }, [])

  const section = SECTIONS[index] ?? SECTIONS[0]
  const light = isLightSection(section.id)

  // Colour system adapts to the section background; CSS transitions tween it
  // across the seam so there's no hard flip.
  const textColor = light ? 'rgba(20,22,34,0.92)' : 'rgba(245,240,232,0.92)'
  const glassBg = light ? 'rgba(245,240,232,0.55)' : 'rgba(18,22,46,0.40)'
  const glassBorder = light ? 'rgba(20,22,34,0.12)' : 'rgba(255,255,255,0.18)'
  const activeFill = light ? 'rgba(20,22,34,0.92)' : 'rgba(245,240,232,0.95)'
  const activeText = light ? 'rgba(245,240,232,0.98)' : 'rgba(18,22,46,0.95)'
  const hoverFill = light ? 'rgba(20,22,34,0.10)' : 'rgba(255,255,255,0.14)'

  // Mobile is always the collapsed pill; reduced-motion is always expanded.
  const expanded = reduce ? true : isMobile ? false : settled

  const logoAnim = useAnimation()
  const onLogoHover = async () => {
    if (reduce) return
    await logoAnim.start({ rotate: 360, transition: { duration: 0.5, ease: 'easeInOut' } })
    logoAnim.set({ rotate: 0 })
  }

  const [hoveredId, setHoveredId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  // Hover previews the section palette (FluidGradient gates it to Hero).
  const onEnter = (id, navIdx) => {
    setHoveredId(id)
    setHoverSection(navIdx + 1) // NAV index → SECTIONS index (1..4)
  }
  const onLeave = () => {
    setHoveredId(null)
    setHoverSection(-1)
  }
  useEffect(() => () => setHoverSection(-1), [])
  useEffect(() => { const t = setTimeout(() => setMenuOpen(false), 0); return () => clearTimeout(t) }, [index]) // close menu when section changes

  // Close the mobile dropdown on an outside tap (also lets the screenshot
  // script's tap('body') dismiss it).
  const wrapRef = useRef(null)
  useEffect(() => {
    if (!menuOpen) return
    const onDown = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onDown)
    return () => document.removeEventListener('pointerdown', onDown)
  }, [menuOpen])

  const go = (id, e) => {
    e.stopPropagation()
    setMenuOpen(false)
    onLeave()
    goToSection(navigate, id, e)
  }

  const pillWidth = isMobile ? BAR_H : expanded ? expandedW : BAR_H

  return (
    // Full-width, pointer-events-none strip so the fixed header never blocks
    // clicks across the top of the page; only the pill itself is interactive.
    <div
      style={{
        position: 'fixed',
        top: 18,
        left: 0,
        right: 0,
        zIndex: 200,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div ref={wrapRef} style={{ position: 'relative', pointerEvents: 'auto' }}>
        <motion.div
          animate={{ width: pillWidth }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 30 }}
          style={{
            height: BAR_H,
            borderRadius: BAR_H / 2,
            background: glassBg,
            border: `1px solid ${glassBorder}`,
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            boxShadow: '0 8px 30px rgba(8,12,40,0.18)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.5s ease, border-color 0.5s ease',
          }}
        >
          {/* Monogram — home on desktop, menu toggle on mobile */}
          <button
            type="button"
            aria-label={isMobile ? 'Section navigation' : 'Andrew Jiang — home'}
            aria-expanded={isMobile ? menuOpen : undefined}
            onClick={(e) =>
              isMobile ? setMenuOpen((o) => !o) : go('hero', e)
            }
            style={{
              flex: '0 0 auto',
              width: BAR_H,
              height: BAR_H,
              display: 'grid',
              placeItems: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <motion.img
              src={LOGO} alt="" width={24} height={24} draggable={false}
              animate={logoAnim}
              onHoverStart={onLogoHover}
            />
          </button>

          {/* Links — fade in when expanded, clipped by the pill while collapsed */}
          {!isMobile && (
            <motion.ul
              animate={{ opacity: expanded ? 1 : 0 }}
              transition={{ duration: 0.2 }}
              className="font-sans font-bold uppercase"
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-evenly',
                listStyle: 'none',
                whiteSpace: 'nowrap',
                letterSpacing: '0.16em',
                fontSize: 'var(--text-label)',
                pointerEvents: expanded ? 'auto' : 'none',
              }}
            >
              {NAV_SECTIONS.map((s, i) => {
                const active = section.id === s.id
                const hovered = hoveredId === s.id
                const bg = active ? activeFill : hovered ? hoverFill : 'transparent'
                const fg = active ? activeText : textColor
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={(e) => go(s.id, e)}
                      onMouseEnter={() => onEnter(s.id, i)}
                      onMouseLeave={onLeave}
                      style={{
                        background: bg,
                        color: fg,
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 16px',
                        borderRadius: 999,
                        font: 'inherit',
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                        transform: hovered && !active ? 'scale(1.06)' : 'scale(1)',
                        transition: 'background 0.25s ease, color 0.25s ease, transform 0.2s ease',
                      }}
                    >
                      {s.label}
                    </button>
                  </li>
                )
              })}
            </motion.ul>
          )}
        </motion.div>

        {/* Mobile dropdown */}
        <AnimatePresence>
          {isMobile && menuOpen && (
            <motion.ul
              key="mobile-menu"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
              className="font-sans font-bold uppercase"
              style={{
                position: 'absolute',
                top: BAR_H + 10,
                left: '50%',
                transform: 'translateX(-50%)',
                margin: 0,
                padding: 8,
                listStyle: 'none',
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                minWidth: 160,
                borderRadius: 18,
                background: glassBg,
                border: `1px solid ${glassBorder}`,
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 12px 36px rgba(8,12,40,0.28)',
                letterSpacing: '0.18em',
                fontSize: 'var(--text-label)',
              }}
            >
              {NAV_SECTIONS.map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    onClick={(e) => go(s.id, e)}
                    style={{
                      width: '100%',
                      textAlign: 'center',
                      background: section.id === s.id ? activeFill : 'transparent',
                      color: section.id === s.id ? activeText : textColor,
                      border: 'none',
                      cursor: 'pointer',
                      padding: '12px 16px',
                      borderRadius: 12,
                      font: 'inherit',
                      letterSpacing: 'inherit',
                      textTransform: 'inherit',
                    }}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </motion.ul>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
