/**
 * LoadingScreen.tsx — Entry Loading Veil
 *
 * A fixed full-viewport cover that hides the page while the WebGL gradient
 * prewarms and fonts finish loading. The logo SVG (same as SiteHeader's
 * monogram) pulses gently in the centre as a progress indicator. Once both
 * signals fire the logo and veil ink-dissolve away using the site's shared
 * SVG turbulence filter — the same motion language as PageTransition and
 * InkReveal. Lenis is paused while visible and started on exit.
 *
 * Reduced motion: plain opacity fade, no dissolve filter.
 * Mobile (≤767px): the SVG turbulence veil is CPU-rasterized at device DPR
 * and janks on phones, so the veil dissolve runs as the same threshold sweep
 * on a GPU canvas instead (InkVeilCanvas.jsx); the logo keeps a cheap CSS
 * blur-and-fade (the useInkFilter mobile pattern).
 */
import { useEffect, useState, useRef } from 'react'
import {
  motion,
  useMotionValue,
  useMotionValueEvent,
  useTransform,
  animate,
  useReducedMotion,
} from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import useMediaQuery from '../hooks/useMediaQuery'
import InkVeilCanvas from './InkVeilCanvas'

const LOGO = '/favicon/logo.svg'

// Minimum display time so the loader never flashes imperceptibly.
const MIN_SHOW_MS = 800

// Ink-dissolve SVG filter values — same math as PageTransition.jsx:
// alpha = SLOPE·noiseR + intercept; sweeping intercept dissolves the veil.
const SLOPE = 40
const interceptAt = (t: number) => -SLOPE - 5 + (SLOPE + 10) * t
const matrixValues = (t: number) =>
  `1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  ${SLOPE} 0 0 0 ${interceptAt(t)}`

export default function LoadingScreen({ ready }: { ready: boolean }) {
  const reduceMotion = useReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  // Reduced motion → flat opacity fade. Mobile → GPU canvas veil instead of
  // the SVG filter (which mobile browsers rasterize on the CPU every frame).
  const plainFade = reduceMotion
  const canvasVeil = isMobile && !reduceMotion
  const lenisRef = useLenisContext()
  const [dismissed, setDismissed] = useState(false)
  const [minTimePassed, setMinTimePassed] = useState(false)

  // Enforce minimum display time.
  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_SHOW_MS)
    return () => clearTimeout(id)
  }, [])

  // Block scroll while the loader is showing.
  useEffect(() => {
    lenisRef?.current?.stop()
  }, [lenisRef])

  const canDismiss = ready && minTimePassed

  // ---- Dissolve-out animation ----
  const t = useMotionValue(1)           // 1 = fully visible, 0 = gone
  const matrixRef = useRef<SVGFEColorMatrixElement | null>(null)

  useEffect(() => {
    if (!canDismiss) return
    const controls = animate(t, 0, {
      duration: reduceMotion ? 0.3 : 0.8,
      ease: [0.76, 0, 0.24, 1],
      onComplete: () => {
        setDismissed(true)
        lenisRef?.current?.start()
      },
    })
    return () => controls.stop()
  }, [canDismiss, t, reduceMotion, lenisRef])

  useMotionValueEvent(t, 'change', (v) => {
    if (plainFade || canvasVeil) return
    matrixRef.current?.setAttribute('values', matrixValues(v))
  })

  // Veil dissolves via the turbulence composite; logo dissolves by the same
  // useInkFilter displacement pattern (separate filter so they can have
  // different seeds / feel).
  const veilFilter = useTransform(t, (v) =>
    !plainFade && v > 0 && v < 1 ? 'url(#loader-dissolve)' : 'none'
  )
  const veilOpacity = useTransform(t, (v) => (plainFade ? v : v > 0 ? 1 : 0))

  // Logo dissolve — runs on a slightly faster sub-curve for a staggered feel
  const logoDisp = useRef<SVGFEDisplacementMapElement | null>(null)
  const logoBlur = useRef<SVGFEGaussianBlurElement | null>(null)
  const LOGO_MAX_SCALE = 80
  const LOGO_MAX_BLUR = 14
  useMotionValueEvent(t, 'change', (v) => {
    if (plainFade || canvasVeil) return
    // Logo dissolves faster (starts strong as soon as canDismiss fires)
    const k = Math.min(1, Math.max(0, v))
    const inv = 1 - k            // 0 → 1 as veil fades
    const logoProg = Math.min(1, inv * 1.6) // logo reaches full dissolve at ~60% of the animation
    logoDisp.current?.setAttribute('scale', String(LOGO_MAX_SCALE * logoProg))
    logoBlur.current?.setAttribute('stdDeviation', String(LOGO_MAX_BLUR * logoProg))
  })
  const logoFilter = useTransform(t, (v) => {
    if (plainFade || !(v > 0 && v < 1)) return 'none'
    if (canvasVeil) {
      // GPU-composited CSS blur (quarter-px steps — see useInkFilter.jsx),
      // on the logo's faster sub-curve.
      const logoProg = Math.min(1, (1 - v) * 1.6)
      return `blur(${Math.round(LOGO_MAX_BLUR * logoProg * 4) / 4}px)`
    }
    return 'url(#loader-logo-dissolve)'
  })
  const logoOpacity = useTransform(t, [1, 0.3, 0], [1, 0.6, 0])

  if (dismissed) return null

  return (
    <motion.div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        opacity: veilOpacity,
      }}
    >
      {/* SVG filter definitions — desktop only; mobile dissolves on the GPU */}
      {!plainFade && !canvasVeil && (
        <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
          <defs>
            {/* Veil dissolve — same shape as PageTransition */}
            <filter id="loader-dissolve" x="-10%" y="-10%" width="120%" height="120%">
              <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="3" seed="12" result="noise" />
              <feColorMatrix ref={matrixRef} in="noise" type="matrix" values={matrixValues(1)} result="thresh" />
              <feComposite in="SourceGraphic" in2="thresh" operator="in" result="cut" />
              <feDisplacementMap in="cut" in2="noise" scale="30" xChannelSelector="R" yChannelSelector="G" />
            </filter>
            {/* Logo dissolve — finer grain, different seed for visual variety */}
            <filter id="loader-logo-dissolve" x="-25%" y="-25%" width="150%" height="150%">
              <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="4" seed="9" result="n" />
              <feDisplacementMap ref={logoDisp} in="SourceGraphic" in2="n" scale={LOGO_MAX_SCALE} xChannelSelector="R" yChannelSelector="G" result="d" />
              <feGaussianBlur ref={logoBlur} in="d" stdDeviation={LOGO_MAX_BLUR} />
            </filter>
          </defs>
        </svg>
      )}

      {/* Solid background — hero's dark cobalt base. Mobile renders the same
          dissolve as a fragment shader (InkVeilCanvas) instead of filtering
          this div. */}
      {canvasVeil ? (
        <InkVeilCanvas
          t={t}
          colorTop="rgb(22,104,222)"
          colorBottom="rgb(14,42,140)"
          seed={12}
        />
      ) : (
        <motion.div
          style={{
            position: 'absolute',
            inset: -48,         // bleed past edges like PageTransition
            background: 'linear-gradient(to bottom, rgb(22,104,222), rgb(14,42,140))',
            filter: veilFilter,
          }}
        />
      )}

      {/* Logo — pulses gently while waiting, then ink-dissolves away */}
      <motion.div
        style={{
          position: 'relative',
          zIndex: 1,
          filter: logoFilter,
          opacity: logoOpacity,
        }}
      >
        <motion.img
          src={LOGO}
          alt=""
          draggable={false}
          width={64}
          height={64}
          animate={
            canDismiss
              ? {}
              : {
                scale: [1, 1.08, 1],
                opacity: [0.85, 1, 0.85],
              }
          }
          transition={
            canDismiss
              ? {}
              : {
                duration: 2,
                repeat: Infinity,
                ease: 'easeInOut',
              }
          }
          style={{
            filter: 'drop-shadow(0 4px 24px rgba(8,12,40,0.35))',
          }}
        />
      </motion.div>
    </motion.div>
  )
}
