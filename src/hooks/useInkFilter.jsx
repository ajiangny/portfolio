/**
 * useInkFilter.jsx — scrubbable ink-dissolve filter (ref: kaiseisadatoki-v4
 * "ink-anim")
 *
 * An SVG turbulence displacement (maxScale→0) + gaussian blur (maxBlur→0) that
 * resolves as the driven MotionValue `t` runs 0→1, reading as ink settling
 * onto the page. The returned `filter` drops to 'none' outside (0,1) so
 * settled elements get their descendant backdrop-blur and rendering perf
 * back, and hidden elements cost nothing.
 *
 * Returns { defs, filter }: render `defs` anywhere inside (or beside) the
 * element and put `filter` on its style. For the one-shot in-view variant see
 * components/InkDissolve.jsx.
 */
import { useId, useRef } from 'react'
import { useTransform, useMotionValueEvent } from 'framer-motion'

export default function useInkFilter(t, { maxScale = 70, maxBlur = 10, octaves = 4 } = {}) {
  const id = `ink-${useId().replace(/[^a-zA-Z0-9-]/g, '')}`
  const dispRef = useRef(null)
  const blurRef = useRef(null)

  useMotionValueEvent(t, 'change', (v) => {
    const k = 1 - Math.min(1, Math.max(0, v))
    dispRef.current?.setAttribute('scale', String(maxScale * k))
    blurRef.current?.setAttribute('stdDeviation', String(maxBlur * k))
  })

  const filter = useTransform(t, (v) => (v > 0 && v < 1 ? `url(#${id})` : 'none'))

  // 0×0 absolute — layout-inert wherever it's rendered.
  const defs = (
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
