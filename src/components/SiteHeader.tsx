/**
 * SiteHeader.tsx — Global Morphing Navigation Header (riot slab)
 *
 * One header for the whole site (rendered in App.tsx, fixed, z-200, below the
 * PageTransition curtain). Expanded = AJ monogram (left) + equal links
 * (about/projects/gallery/contact, right). Fully expanded only while the Hero
 * section is active; past Hero it collapses to a monogram pill wrapped in a
 * scroll-progress ring, and re-expands on hover. A single sliding pill
 * indicator tracks the hovered/active link. Glass + text colours adapt to the
 * active section's background (logo inverts to black on light sections).
 * Hovering a link previews that section's palette in the fluid gradient
 * (gated to Hero inside FluidGradient). On mobile it stays a monogram slab.
 * On every size the monogram opens the full-screen StyleMenu: one nav
 * system with a compact form (this bar) and an expanded form (the menu).
 *
 * Riot material: the bar is a flat jagged slab (cream on dark sections, ink
 * on light ones) with a hard offset shadow painted by a drop-shadow on the
 * unclipped wrapper; the hover/active indicator is a skewed riot-cobalt slab
 * that springs between links (selection as a costume change).
 */
import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import { motion, useReducedMotion, useAnimation, useScroll } from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import { SECTIONS, NAV_SECTIONS, goToSection } from '../config/sections'
import useMediaQuery from '../hooks/useMediaQuery'
import useActiveSection from '../hooks/useActiveSection'
import { setHoverSection } from './gradient/hoverSignal'
import { SECTION_PALETTES } from './gradient/gradientConfig'
import type { Vec3 } from './gradient/colors'
import { SNAP, jagged } from '../style/riot'
import { openMenu } from './style/menuSignal'
import * as sfx from '../style/sfx'

const GUTTER = 40      // px viewport inset at each side when expanded
const MAX_W = 2200     // px expanded pill cap (stays wide on 2560+ monitors)
const BAR_H = 46       // px slab height (collapsed width == height → square)
const LOGO = '/favicon/logo.svg'

// Perceived luminance of a normalised (0..1) rgb triple. The header sits at the
// top of the viewport, so we read the gradient's TOP base colour (base[0]) for
// the section behind it — that's the real background, which can differ from a
// section's themeRgb (e.g. Contact: cream themeRgb but a near-black gradient).
const lum = ([r, g, b]: Vec3) => 0.299 * r + 0.587 * g + 0.114 * b
const isLightSection = (id: string) => lum((SECTION_PALETTES[id] ?? SECTION_PALETTES.hero).base[0]) > 0.6

export default function SiteHeader() {
  const { navigate } = useTransitionContext()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const reduce = useReducedMotion()
  const { index } = useActiveSection()

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

  // Flat colours that invert with the section background (riot rule 1): a
  // cream slab on dark/cobalt sections, an ink slab on light ones. The active
  // indicator is always the riot cobalt.
  const textColor = light ? 'var(--color-cream)' : 'var(--color-slab)'
  const barBg = light ? 'var(--color-slab)' : 'var(--color-cream)'
  const shadowColor = light ? '#1E4BD2' : '#0F1016'
  const activeFill = 'var(--color-riot)'
  const activeText = 'var(--color-cream)'

  // Desktop: full bar only while Hero is active; past it, a logo pill that
  // re-expands on hover. Mobile is always the pill; reduced-motion always expanded.
  const [pillHovered, setPillHovered] = useState(false)
  const expanded = reduce ? true : isMobile ? false : index === 0 || pillHovered

  // Whole-page scroll progress drives the ring around the collapsed pill.
  const { scrollYProgress } = useScroll()

  const logoAnim = useAnimation()
  const onLogoHover = async () => {
    if (reduce) return
    await logoAnim.start({ rotate: 360, transition: { duration: 0.5, ease: 'easeInOut' } })
    logoAnim.set({ rotate: 0 })
  }

  const [hoveredId, setHoveredId] = useState<string | null>(null)

  // Hover previews the section palette (FluidGradient gates it to Hero).
  const onEnter = (id: string, navIdx: number) => {
    setHoveredId(id)
    sfx.tick(navIdx)
    setHoverSection(navIdx + 1) // NAV index → SECTIONS index (1..4)
  }
  const onLeave = () => {
    setHoveredId(null)
    setHoverSection(-1)
  }
  useEffect(() => () => setHoverSection(-1), [])

  const go = (id: string, e: ReactMouseEvent) => {
    e.stopPropagation()
    sfx.confirm()
    // Pin the indicator on the clicked link instead of clearing hoveredId —
    // clearing it here would fall back to the (still-old) active section and
    // rubberband the pill back before the transition ever moves it forward.
    setHoveredId(id)
    setHoverSection(-1)
    goToSection(navigate, id)
  }

  // Once the real active section catches up to the clicked target, drop the
  // pin so hover/leave behaves normally again.
  useEffect(() => {
    // Deliberate: unpin exactly once when the scroll catches up to the clicked
    // section; the functional update is a no-op re-render in every other case.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHoveredId((prev) => (prev === section.id ? null : prev))
  }, [section.id])

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
      <div
        onMouseEnter={() => setPillHovered(true)}
        onMouseLeave={() => setPillHovered(false)}
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          // Hard offset shadow of the clipped slab (a box-shadow would be clipped).
          filter: `drop-shadow(5px 5px 0 ${shadowColor})`,
          transition: 'filter 0.3s linear',
          rotate: expanded ? '-0.6deg' : '-4deg',
        }}
      >
        <motion.div
          animate={{ width: pillWidth }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 200, damping: 30 }}
          style={{
            position: 'relative',
            height: BAR_H,
            background: barBg,
            clipPath: 'polygon(8px 0, 100% 3px, calc(100% - 5px) 100%, 0 calc(100% - 4px))',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            transition: 'background 0.3s linear',
          }}
        >
          {/* Scroll-progress gauge: a flat riot-cobalt stripe along the
              collapsed slab's bottom edge, filling left → right. */}
          <motion.span
            aria-hidden
            animate={{ opacity: expanded ? 0 : 1 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: 5,
              background: 'var(--color-riot)',
              originX: 0,
              scaleX: scrollYProgress,
              pointerEvents: 'none',
            }}
          />
          {/* Monogram — the menu button everywhere: it opens the full-screen
              StyleMenu (the nav's expanded form; Home lives there). */}
          <button
            type="button"
            aria-label="Open menu"
            data-cursor-label="Menu"
            onClick={() => openMenu()}
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
              style={{ filter: light ? 'none' : 'invert(1)', transition: 'filter 0.3s linear' }}
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
                // One shared-layout pill slides to the hovered link, resting
                // on the active section when nothing is hovered.
                const targeted = (hoveredId ?? section.id) === s.id
                return (
                  <li key={s.id} style={{ position: 'relative', display: 'flex' }}>
                    {targeted && (
                      <motion.span
                        layoutId="nav-indicator"
                        transition={reduce ? { duration: 0 } : SNAP}
                        style={{
                          position: 'absolute',
                          inset: '-3px -6px',
                          skewX: -14,
                          background: activeFill,
                          clipPath: jagged(i + 4, 10),
                        }}
                      />
                    )}
                    <button
                      type="button"
                      onClick={(e) => go(s.id, e)}
                      onMouseEnter={() => onEnter(s.id, i)}
                      onMouseLeave={onLeave}
                      style={{
                        position: 'relative',
                        background: 'transparent',
                        color: targeted ? activeText : textColor,
                        border: 'none',
                        cursor: 'pointer',
                        padding: '8px 16px',
                        font: 'inherit',
                        letterSpacing: 'inherit',
                        textTransform: 'inherit',
                        transition: 'color 0.1s linear',
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


      </div>
    </div>
  )
}
