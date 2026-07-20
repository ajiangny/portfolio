/**
 * PageTransition.tsx — Blur + Ink-Dissolve Page Transition Veil
 *
 * A fixed full-screen veil used by TransitionContext during section-to-section
 * navigation: the backdrop blurs up while the section-coloured tint dissolves
 * in through turbulence-thresholded ink blots (same SVG technique as
 * hooks/useInkFilter.tsx), the scroll jump happens under full cover, then the
 * veil dissolves away to reveal the new section.
 * Reduced motion → plain opacity fade, no dissolve filter.
 * Mobile (≤767px) → the same ink dissolve, but rendered as a fragment shader
 * on a GPU canvas (InkVeilCanvas.jsx) instead of the SVG filter, which mobile
 * browsers rasterize on the CPU at device DPR every frame. Backdrop blur
 * stays off on mobile — a full-viewport 24px backdrop-filter on top of the
 * WebGL sim is still the most expensive frame on phones.
 */
import { useEffect, useRef } from 'react'
import {
  motion, useMotionValue, useMotionValueEvent, useTransform,
  animate, useReducedMotion,
} from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import useMediaQuery from '../hooks/useMediaQuery'
import InkVeilCanvas from './InkVeilCanvas'

// Alpha threshold sweep: alpha = SLOPE·noiseR + intercept, so as the
// intercept rises the noise blots flip from transparent to opaque one
// patch at a time — reading as ink flooding the screen.
const SLOPE = 40
const interceptAt = (t: number) => -SLOPE - 5 + (SLOPE + 10) * t // coverage 0 → full over t 0 → 1
const matrixValues = (t: number) =>
  `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ${SLOPE} 0 0 0 ${interceptAt(t)}`

export default function PageTransition() {
  const { isActive, transitionColor } = useTransitionContext()
  const reduceMotion = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const plainFade = reduceMotion
  const canvasVeil = isMobile && !reduceMotion
  const t = useMotionValue(0)
  const matrixRef = useRef<SVGFEColorMatrixElement | null>(null)

  useEffect(() => {
    const controls = animate(t, isActive ? 1 : 0, {
      duration: 0.6, // matches TransitionProvider's 600ms phases
      ease: [0.76, 0, 0.24, 1],
    })
    return () => controls.stop()
  }, [isActive, t])

  useMotionValueEvent(t, 'change', (v) => {
    if (plainFade || canvasVeil) return
    matrixRef.current?.setAttribute('values', matrixValues(v))
  })

  const backdropFilter = useTransform(t, (v) => (!isMobile && v > 0 ? `blur(${24 * v}px)` : 'none'))
  // Filter only mid-transition: settled/hidden states render unfiltered for perf.
  const filter = useTransform(t, (v) =>
    !plainFade && v > 0 && v < 1 ? 'url(#veil-dissolve)' : 'none'
  )
  const opacity = useTransform(t, (v) => (plainFade ? v : v > 0 ? 1 : 0))

  return (
    <motion.div
      className="fixed inset-0 pointer-events-none z-9999"
      style={{ backdropFilter, opacity }}
    >
      {!plainFade && !canvasVeil && (
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
      )}
      {/* Tint bleeds 48px past the viewport so the edge displacement never
          exposes a gap at the screen borders. Mobile renders the dissolve as
          a fragment shader instead of filtering the tint. */}
      {canvasVeil ? (
        <InkVeilCanvas t={t} colorTop={transitionColor} colorBottom={transitionColor} seed={7} />
      ) : (
        <motion.div
          style={{
            position: 'absolute',
            inset: -48,
            backgroundColor: transitionColor,
            filter,
          }}
        />
      )}
    </motion.div>
  )
}
