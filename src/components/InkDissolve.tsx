/**
 * InkDissolve.tsx — one-shot "slam" reveal (riot rule 5)
 *
 * Was a slow ink-dissolve settle; in the riot system one-shot reveals are
 * fast and physical instead: content kicks in from the left on a skew,
 * overshoots its spot and holds still. Kept under the old name/props so every
 * call site works unchanged (`maxScale`/`maxBlur`/`octaves` are accepted and
 * ignored). Scroll-scrubbed ink effects (About choreography, hover swaps)
 * still use hooks/useInkFilter directly — the fluid ink stays the site's
 * signature; the reveals got faster.
 * Reduced motion → quick plain fade.
 */
import { useRef, type ReactNode, type CSSProperties } from 'react'
import { motion, useInView, useReducedMotion, type UseInViewOptions } from 'framer-motion'
import { ENTER_EASE } from '../style/riot'

export interface InkRevealProps {
  children?: ReactNode
  className?: string
  style?: CSSProperties
  duration?: number
  delay?: number
  margin?: UseInViewOptions['margin']
  maxScale?: number
  maxBlur?: number
  octaves?: number
}

export default function InkReveal({
  children, className, style,
  duration = 1.8, delay = 0, margin = '-120px',
}: InkRevealProps) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin })

  // Old durations were tuned for a long settle; a slam wants ~a third of that.
  const slam = Math.min(0.6, Math.max(0.35, duration * 0.3))

  return (
    <motion.div
      ref={ref}
      className={className}
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -60, skewX: -14 }}
      animate={inView ? { opacity: 1, x: 0, skewX: 0 } : undefined}
      transition={
        reduceMotion
          ? { duration: 0.3, delay }
          : { duration: slam, delay, ease: ENTER_EASE, opacity: { duration: 0.12, delay } }
      }
      style={style}
    >
      {children}
    </motion.div>
  )
}
