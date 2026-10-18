/**
 * PageTransition.tsx — Slash-wipe page transition (riot rules 2, 5, 6)
 *
 * A fixed full-screen veil used by TransitionContext during section-to-section
 * navigation. Two flat layers with diagonal leading edges sweep across the
 * screen left → right: an ink slab first, then the target section's colour
 * (with a halftone screen) right behind it. The scroll jump happens under
 * full cover, then both layers keep travelling right and exit the far edge —
 * the wipe passes *through* the screen instead of reversing.
 *
 * The motion is pure clip-path on two divs (compositor-cheap), so desktop and
 * mobile share one path — no SVG filter, no GPU canvas, no backdrop blur.
 * Reduced motion → plain opacity fade of the colour layer.
 */
import { useEffect, useRef } from 'react'
import {
  motion, useMotionValue, useMotionValueEvent, useTransform, animate, useReducedMotion,
} from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import { RIOT, WIPE_EASE } from '../style/riot'

const SKEW = 22 // % — how far the top of each edge leads the bottom (the slash angle)
const LAG = 0.18 // the colour layer trails the ink layer by this fraction of the sweep

const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

// Panel spanning [left, right] (in % of width), with both vertical edges
// slanted by SKEW so it reads as a slash, not a box.
const slab = (left: number, right: number) =>
  `polygon(${left + SKEW}% 0%, ${right + SKEW}% 0%, ${right}% 100%, ${left}% 100%)`

// Enter: right edge sweeps in from off-left. Exit: left edge follows it out.
// `lag` delays this layer's entry and advances its exit, so the ink layer is
// first in and last out.
function layerPath(t: number, entering: boolean, lag: number, leadOut: boolean) {
  const START = -SKEW - 2
  const END = 102
  if (entering) {
    const p = clamp01((t - lag) / (1 - LAG))
    return slab(START, START + (END - START) * p)
  }
  const q = 1 - t
  const p = leadOut ? clamp01(q / (1 - LAG)) : clamp01((q - LAG) / (1 - LAG))
  return slab(START + (END - START) * p, END)
}

export default function PageTransition() {
  const { isActive, transitionColor } = useTransitionContext()
  const reduceMotion = useReducedMotion()
  const t = useMotionValue(0)
  const enteringRef = useRef(false)

  const inkClip = useMotionValue(slab(-SKEW - 2, -SKEW - 2))
  const colorClip = useMotionValue(slab(-SKEW - 2, -SKEW - 2))

  useEffect(() => {
    enteringRef.current = isActive
    const controls = animate(t, isActive ? 1 : 0, {
      duration: 0.6, // matches TransitionProvider's 600ms phases
      ease: WIPE_EASE,
    })
    return () => controls.stop()
  }, [isActive, t])

  useMotionValueEvent(t, 'change', (v) => {
    if (reduceMotion) return
    const entering = enteringRef.current
    inkClip.set(layerPath(v, entering, 0, false))
    colorClip.set(layerPath(v, entering, LAG, true))
  })

  const visible = useTransform(t, (v) => (v > 0 ? 1 : 0))
  const fade = useTransform(t, (v) => v)

  return (
    <motion.div className="fixed inset-0 pointer-events-none z-9999" style={{ opacity: reduceMotion ? fade : visible }}>
      {!reduceMotion && (
        <motion.div style={{ position: 'absolute', inset: 0, background: RIOT.ink, clipPath: inkClip }} />
      )}
      <motion.div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: transitionColor,
          backgroundImage: 'radial-gradient(rgba(15,16,22,0.18) 1.6px, transparent 1.8px)',
          backgroundSize: '12px 12px',
          clipPath: reduceMotion ? 'none' : colorClip,
        }}
      />
    </motion.div>
  )
}
