/**
 * PageTransition.jsx — Blur + Ink-Dissolve Page Transition Veil
 *
 * A fixed full-screen veil used by TransitionContext during section-to-section
 * navigation: the backdrop blurs up while the section-coloured tint dissolves
 * in through turbulence-thresholded ink blots (same SVG technique as
 * hooks/useInkFilter.jsx), the scroll jump happens under full cover, then the
 * veil dissolves away to reveal the new section.
 * Reduced motion → plain opacity fade, no dissolve filter.
 */
import { useEffect, useRef } from 'react'
import {
  motion, useMotionValue, useMotionValueEvent, useTransform,
  animate, useReducedMotion,
} from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'

// Alpha threshold sweep: alpha = SLOPE·noiseR + intercept, so as the
// intercept rises the noise blots flip from transparent to opaque one
// patch at a time — reading as ink flooding the screen.
const SLOPE = 40
const interceptAt = (t) => -SLOPE - 5 + (SLOPE + 10) * t // coverage 0 → full over t 0 → 1
const matrixValues = (t) =>
  `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ${SLOPE} 0 0 0 ${interceptAt(t)}`

export default function PageTransition() {
  const { isActive, transitionColor } = useTransitionContext()
  const reduceMotion = useReducedMotion()
  const t = useMotionValue(0)
  const matrixRef = useRef(null)

  useEffect(() => {
    const controls = animate(t, isActive ? 1 : 0, {
      duration: 0.6, // matches TransitionProvider's 600ms phases
      ease: [0.76, 0, 0.24, 1],
    })
    return () => controls.stop()
  }, [isActive, t])

  useMotionValueEvent(t, 'change', (v) => {
    matrixRef.current?.setAttribute('values', matrixValues(v))
  })

  const backdropFilter = useTransform(t, (v) => (v > 0 ? `blur(${24 * v}px)` : 'none'))
  // Filter only mid-transition: settled/hidden states render unfiltered for perf.
  const filter = useTransform(t, (v) =>
    !reduceMotion && v > 0 && v < 1 ? 'url(#veil-dissolve)' : 'none'
  )
  const opacity = useTransform(t, (v) => (reduceMotion ? v : v > 0 ? 1 : 0))

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-9999"
      style={{ backdropFilter, opacity }}
    >
      <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
        <defs>
          <filter id="veil-dissolve" x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" seed="7" result="noise" />
            <feColorMatrix ref={matrixRef} in="noise" type="matrix" values={matrixValues(0)} result="thresh" />
            <feComposite in="SourceGraphic" in2="thresh" operator="in" result="cut" />
            <feDisplacementMap in="cut" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>
      {/* Tint bleeds 48px past the viewport so the edge displacement never
          exposes a gap at the screen borders. */}
      <motion.div
        style={{
          position: 'absolute',
          inset: -48,
          backgroundColor: transitionColor,
          filter,
        }}
      />
    </motion.div>
  )
}
