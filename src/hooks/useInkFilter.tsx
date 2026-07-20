/**
 * useInkFilter.tsx — scrubbable ink-dissolve filter (ref: kaiseisadatoki-v4
 * "ink-anim")
 *
 * An SVG turbulence displacement (maxScale→0) + gaussian blur (maxBlur→0) that
 * resolves as the driven MotionValue `t` runs 0→1, reading as ink settling
 * onto the page. The returned `filter` drops to 'none' outside (0,1) so
 * settled elements get their descendant backdrop-blur and rendering perf
 * back, and hidden elements cost nothing.
 *
 * Mobile (≤767px): SVG url(#) filter chains are CPU-rasterized on most mobile
 * browsers, and every scale/stdDeviation write re-rasterizes the whole
 * subtree at device DPR — several at once jank badly on phones. There the
 * hook returns no defs and a plain CSS blur(maxBlur→0) instead, which stays
 * GPU-composited and keeps the fade-and-sharpen read.
 *
 * Returns { defs, filter }: render `defs` anywhere inside (or beside) the
 * element and put `filter` on its style. For the one-shot in-view variant see
 * components/InkDissolve.tsx.
 */
import { useId, useRef, type ReactNode } from 'react'
import { useTransform, useMotionValueEvent, type MotionValue } from 'framer-motion'
import useMediaQuery from './useMediaQuery'

export interface InkFilterOptions {
  maxScale?: number
  maxBlur?: number
  octaves?: number
}

export interface InkFilter {
  defs: ReactNode
  filter: MotionValue<string>
}

export default function useInkFilter(
  t: MotionValue<number>,
  { maxScale = 70, maxBlur = 10, octaves = 4 }: InkFilterOptions = {},
): InkFilter {
  const isMobile = useMediaQuery('(max-width: 767px)')
  const id = `ink-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const dispRef = useRef<SVGFEDisplacementMapElement | null>(null)
  const blurRef = useRef<SVGFEGaussianBlurElement | null>(null)

  useMotionValueEvent(t, 'change', (v) => {
    if (isMobile) return
    const k = 1 - Math.min(1, Math.max(0, v))
    dispRef.current?.setAttribute('scale', String(maxScale * k))
    blurRef.current?.setAttribute('stdDeviation', String(maxBlur * k))
  })

  const filter = useTransform(t, (v) => {
    if (!(v > 0 && v < 1)) return 'none'
    if (!isMobile) return `url(#${id})`
    const k = 1 - Math.min(1, Math.max(0, v))
    // Quarter-px steps so mid-animation frames with no visible change don't
    // invalidate the compositor.
    return `blur(${Math.round(maxBlur * k * 4) / 4}px)`
  })

  // 0×0 absolute — layout-inert wherever it's rendered.
  const defs = isMobile ? null : (
    <svg aria-hidden="true" width="0" height="0" style={{ position: 'absolute' }}>
      <defs>
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves={octaves} seed="5" result="n" />
          <feDisplacementMap ref={dispRef} in="SourceGraphic" in2="n" scale={maxScale} xChannelSelector="R" yChannelSelector="G" result="d" />
          <feGaussianBlur ref={blurRef} in="d" stdDeviation={maxBlur} />
        </filter>
      </defs>
    </svg>
  )

  return { defs, filter }
}
