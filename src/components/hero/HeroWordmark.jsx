/**
 * HeroWordmark.jsx — "ANDREW JIANG" wordmark (vector) with elastic letters.
 *
 * Inlined SVG of the outlined lettering (exported from the design file, so no
 * font dependency). Each letter is its own <path> that springs away from the
 * cursor — the same mouse-repulsion feel the old text ElasticHeading had, but
 * computed in the SVG's user-space (viewBox 0 0 1440 151) so the push scales
 * proportionally with the wordmark at any width.
 *
 * On mount (once scrolled into view) the glyphs ink-dissolve in using the
 * shared filter (hooks/useInkFilter.jsx) — same turbulence-displacement +
 * blur settling to 0 as the rest of the site, instead of a one-off entrance.
 *
 * Fill follows `currentColor` (colour driven from CSS); the tight viewBox means
 * width:100% spans edge-to-edge and seats the glyphs flush on the bottom.
 */
import { useRef, useLayoutEffect, useEffect } from 'react'
import {
  motion, useMotionValue, useTransform, useSpring, useReducedMotion,
  useMotionTemplate, useInView, animate,
} from 'framer-motion'
import useInkFilter from '../../hooks/useInkFilter'
import useMediaQuery from '../../hooks/useMediaQuery'

const VB_W = 1440
const VB_H = 151
const OFF = -99999      // sentinel: cursor not over the wordmark
const RADIUS = 190      // user-space units of influence around each letter
const STRENGTH = 78     // max push, in user-space units
const SPRING = { stiffness: 120, damping: 10, mass: 0.08 }

// One outlined glyph per entry (document order: A N D R E W  J I A N G).
const LETTERS = [
  'M26.761 89.3237C22.6022 92.0359 20.6132 90.7702 22.2406 86.069L52.4371 2.89287H77.7516L130.189 147.547H103.247L89.3239 109.033H68.5299C49.544 109.033 38.695 115 32.1855 133.082L26.9418 147.547H0L4.52044 135.071C17.3585 99.4495 36.706 87.3347 74.6777 87.3347H81.3679L65.0943 42.3111L51.3522 80.2828C44.1195 81.1869 34.5362 84.6224 26.761 89.3237Z',
  'M141.08 34.717C141.08 11.934 151.929 0 170.554 0C187.731 0 199.665 11.0299 205.451 33.6321L224.437 107.586C227.33 118.978 232.032 122.233 242.338 122.233V2.89309H264.036V147.547H242.338C221.363 147.547 205.451 135.794 200.027 114.458L180.137 36.5252C177.063 24.5912 173.627 21.6981 169.649 21.6981C165.852 21.6981 162.778 24.9528 162.778 34.717V147.547H141.08V34.717Z',
  'M333.52 2.89287C377.458 2.89287 408.74 31.1004 408.74 75.2199C408.74 119.339 379.086 147.547 333.52 147.547H282.167V2.89287H333.52ZM307.482 125.849H333.52C363.716 125.849 381.617 106.682 381.617 75.2199C381.617 43.7577 362.993 24.591 333.52 24.591H307.482V125.849Z',
  'M497.709 63.1051C512.355 63.1051 520.492 56.2341 520.492 43.7576C520.492 31.462 512.355 24.591 497.709 24.591H425.02V2.89287H497.709C529.714 2.89287 547.615 17.5391 547.615 43.7576C547.615 67.0831 533.873 81.1869 508.377 84.2608L551.231 147.547H520.673L478.362 84.8033H475.649C459.376 84.8033 450.335 93.8441 450.335 110.118V147.547H425.02V110.118C425.02 79.9212 443.102 63.1051 475.649 63.1051H497.709Z',
  'M666.559 55.8724V77.5705H612.675C596.402 77.5705 587.361 86.6114 587.361 102.885V125.849H670.175V147.547H562.046V106.501C562.046 73.9542 580.128 55.8724 612.675 55.8724H666.559ZM562.046 2.89287H670.175V24.591H562.046V2.89287Z',
  'M721.681 147.547L676.477 2.89287H703.057L734.338 103.066L765.62 2.89287H792.2L771.587 69.0721C781.713 70.8803 789.307 78.2938 793.285 91.4935L796.901 102.885L828.183 2.89287H854.763L809.559 147.547H784.244L770.864 104.693C769.055 98.3646 767.79 96.1948 765.62 96.1948C763.812 96.1948 762.546 98.0029 760.738 103.427L746.996 147.547H721.681Z',
  'M953.821 90.5894V2.89287H979.135V89.3237C979.135 126.934 960.15 150.44 928.506 150.44C893.066 150.44 872.453 128.923 872.453 90.5894H897.768C897.768 115 908.255 128.742 927.241 128.742C944.961 128.742 953.821 116.085 953.821 90.5894Z',
  'M997.224 2.89287H1022.54V147.547H997.224V2.89287Z',
  'M1060.19 89.3237C1056.03 92.0359 1054.04 90.7702 1055.67 86.069L1085.87 2.89287H1111.18L1163.62 147.547H1136.68L1122.75 109.033H1101.96C1082.97 109.033 1072.12 115 1065.62 133.082L1060.37 147.547H1033.43L1037.95 135.071C1050.79 99.4495 1070.14 87.3347 1108.11 87.3347H1114.8L1098.52 42.3111L1084.78 80.2828C1077.55 81.1869 1067.97 84.6224 1060.19 89.3237Z',
  'M1174.51 34.717C1174.51 11.934 1185.36 0 1203.98 0C1221.16 0 1233.1 11.0299 1238.88 33.6321L1257.87 107.586C1260.76 118.978 1265.46 122.233 1275.77 122.233V2.89309H1297.47V147.547H1275.77C1254.79 147.547 1238.88 135.794 1233.46 114.458L1213.57 36.5252C1210.49 24.5912 1207.06 21.6981 1203.08 21.6981C1199.28 21.6981 1196.21 24.9528 1196.21 34.717V147.547H1174.51V34.717Z',
  'M1440 127.476C1427.16 141.942 1408.36 150.44 1386.12 150.44C1343.62 150.44 1313.79 119.34 1313.79 75.2201C1313.79 31.1006 1343.62 0 1386.12 0C1405.46 0 1422.28 6.50944 1434.76 17.7201L1417.94 35.8019C1409.98 26.9418 1398.95 21.6981 1386.12 21.6981C1359.54 21.6981 1340.91 43.7579 1340.91 75.2201C1340.91 106.682 1359.54 128.742 1386.12 128.742C1397.33 128.742 1406.91 124.945 1414.69 117.893V86.4308H1378.52V64.7327H1440V127.476Z',
]

// Repulsion magnitude along one axis (px component of the unit vector × falloff).
function repel(mx, my, cx, cy, axis) {
  if (mx === OFF) return 0
  const dx = mx - cx
  const dy = my - cy
  const dist = Math.hypot(dx, dy)
  if (dist >= RADIUS || dist === 0) return 0
  const falloff = Math.pow(1 - dist / RADIUS, 1.6) * STRENGTH
  return -((axis === 'x' ? dx : dy) / dist) * falloff
}

function ElasticLetter({ d, mouseX, mouseY }) {
  const ref = useRef(null)
  const cx = useRef(VB_W / 2)
  const cy = useRef(VB_H / 2)

  useLayoutEffect(() => {
    try {
      const b = ref.current?.getBBox?.()
      if (b) { cx.current = b.x + b.width / 2; cy.current = b.y + b.height / 2 }
    } catch { /* getBBox can throw if not yet rendered — keep the fallback centre */ }
  }, [])

  const rawX = useTransform([mouseX, mouseY], ([mx, my]) => repel(mx, my, cx.current, cy.current, 'x'))
  const rawY = useTransform([mouseX, mouseY], ([mx, my]) => repel(mx, my, cx.current, cy.current, 'y'))
  const x = useSpring(rawX, SPRING)
  const y = useSpring(rawY, SPRING)

  // Shadow alpha: 0 when cursor is absent or outside radius, peaks at ~0.55 on direct hover.
  const shadowAlpha = useTransform([mouseX, mouseY], ([mx, my]) => {
    if (mx === OFF) return 0
    const dist = Math.hypot(mx - cx.current, my - cy.current)
    if (dist >= RADIUS) return 0
    return Math.pow(1 - dist / RADIUS, 1.8) * 0.55
  })
  const letterFilter = useMotionTemplate`drop-shadow(0 6px 22px rgba(8,12,40,${shadowAlpha}))`

  return <motion.path ref={ref} d={d} style={{ x, y, filter: letterFilter }} />
}

export default function HeroWordmark({ className, style, title = 'Andrew Jiang' }) {
  const svgRef = useRef(null)
  const reduce = useReducedMotion()
  const mouseX = useMotionValue(OFF)
  const mouseY = useMotionValue(OFF)

  // Ink-dissolve entrance, fired once the wordmark scrolls into view.
  // Mobile: no negative margin — the wordmark seats at the very bottom of the
  // viewport (y≈807 of 844), so a -100px inset zone (y<744) can never contain
  // it at scroll 0 and the name stayed invisible until the first scroll.
  const isMobile = useMediaQuery('(max-width: 767px)')
  const inView = useInView(svgRef, { once: true, margin: isMobile ? '0px' : '-100px' })
  const t = useMotionValue(0)
  const { defs: inkDefs, filter: inkFilter } = useInkFilter(t, { maxScale: 50, maxBlur: 10, octaves: 3 })
  useEffect(() => {
    if (!inView) return
    const controls = animate(t, 1, { duration: reduce ? 0.3 : 1.6, ease: [0.215, 0.61, 0.355, 1] })
    return () => controls.stop()
  }, [inView, reduce, t])
  const inkOpacity = useTransform(t, [0, reduce ? 1 : 0.12], [0, 1])

  // Map the cursor into SVG user-space (uniform scale, since preserveAspectRatio meet).
  const onMove = (e) => {
    const svg = svgRef.current
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const s = r.width / VB_W || 1
    mouseX.set((e.clientX - r.left) / s)
    mouseY.set((e.clientY - r.top) / s)
  }
  const onLeave = () => {
    mouseX.set(OFF)
    mouseY.set(OFF)
  }

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      role="img"
      aria-label={title}
      fill="currentColor"
      preserveAspectRatio="xMidYMax meet"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      // overflow:visible so letters springing UP past the tight viewBox top
      // aren't clipped (the Hero section's own overflow-hidden still bounds them
      // at the screen edges).
      style={{ overflow: 'visible', ...style }}
      onPointerMove={reduce ? undefined : onMove}
      onPointerLeave={reduce ? undefined : onLeave}
    >
      {inkDefs}

      {/* Transparent hit area so pointermove fires across the whole wordmark
          box (not only over the painted glyphs). */}
      <rect x="0" y="0" width={VB_W} height={VB_H} fill="transparent" />
      <motion.g style={{ opacity: inkOpacity, filter: reduce ? 'none' : inkFilter }}>
        {reduce ? (
          LETTERS.map((d, i) => <path key={i} d={d} />)
        ) : (
          LETTERS.map((d, i) => (
            <ElasticLetter key={i} d={d} mouseX={mouseX} mouseY={mouseY} />
          ))
        )}
      </motion.g>
    </svg>
  )
}