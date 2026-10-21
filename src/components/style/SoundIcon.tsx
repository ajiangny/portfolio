/**
 * SoundIcon.tsx — the nav bar's animated speaker (SiteHeader's sound toggle)
 *
 * Riot motion on a 24px glyph:
 *   • On: the two waves pulse outward in turn, like a broadcast (CSS loop,
 *     .snd-wave in index.css). Hovering the button speeds them up and kicks
 *     the cone off-axis.
 *   • Off: the strike-through slashes draw in, one stroke then the other.
 *   • Click: the glyph punches in and springs back (SNAP) while three cobalt
 *     slashes burst out from the cone, so every toggle lands like a stamp.
 * Reduced motion keeps the static glyph swap: no loop, punch or burst.
 *
 * The parent button owns the click and the sound; it bumps `burst` on every
 * toggle so the burst replays even when toggled twice quickly.
 */
import { motion, useReducedMotion } from 'framer-motion'
import { SNAP, WIPE_EASE } from '../../style/riot'

// Burst slashes, as [x1, y1, x2, y2], fanning out past the outer wave.
const BURST = [
  [20.5, 3.5, 23.5, 0],
  [23.5, 12, 28, 12],
  [20.5, 20.5, 23.5, 24],
] as const

export default function SoundIcon({ on, burst }: { on: boolean; burst: number }) {
  const reduce = useReducedMotion()
  return (
    <motion.svg
      key={reduce ? undefined : burst}
      className="snd-icon"
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="square"
      aria-hidden
      style={{ overflow: 'visible' }}
      initial={reduce || burst === 0 ? false : { scale: 0.7, rotate: -12 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={SNAP}
    >
      <path className="snd-cone" d="M3 9h4l5-4v14l-5-4H3z" fill="currentColor" stroke="none" />
      {on ? (
        <g key="on">
          <path className="snd-wave snd-wave-1" d="M15.5 9.5c.8.7 1.2 1.6 1.2 2.5s-.4 1.8-1.2 2.5" />
          <path className="snd-wave snd-wave-2" d="M18.5 6.5c1.6 1.4 2.5 3.4 2.5 5.5s-.9 4.1-2.5 5.5" />
        </g>
      ) : (
        <g key="off">
          {['M16 9l5 6', 'M21 9l-5 6'].map((d, i) => (
            <motion.path
              key={d}
              d={d}
              initial={reduce ? false : { pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.14, ease: WIPE_EASE, delay: i * 0.08 }}
            />
          ))}
        </g>
      )}
      {!reduce && burst > 0 && (
        <g stroke="var(--color-riot)" strokeWidth="2.2">
          {BURST.map(([x1, y1, x2, y2], i) => (
            <motion.line
              key={i}
              x1={x1} y1={y1} x2={x2} y2={y2}
              initial={{ pathLength: 0, opacity: 1 }}
              animate={{ pathLength: [0, 1, 1], opacity: [1, 1, 0] }}
              transition={{ duration: 0.36, times: [0, 0.45, 1], ease: 'easeOut', delay: i * 0.03 }}
            />
          ))}
        </g>
      )}
    </motion.svg>
  )
}
