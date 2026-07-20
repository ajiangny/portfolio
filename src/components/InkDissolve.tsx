/**
 * InkDissolve.tsx — one-shot ink-dissolve reveal (ref: kaiseisadatoki-v4
 * "ink-anim")
 *
 * Wraps content in the shared ink filter (hooks/useInkFilter.tsx) and fires it
 * once when scrolled into view: content fades in fast (~12% of the settle),
 * then the turbulence displacement + blur resolve over `duration`, reading as
 * ink settling onto the page. Reduced motion → quick plain fade, no filter.
 *
 * For scroll-scrubbed dissolves drive useInkFilter directly.
 */
import { useRef, useEffect, type ReactNode, type CSSProperties } from 'react'
import {
  motion, useMotionValue, useTransform, useInView, useReducedMotion, animate,
  type UseInViewOptions,
} from 'framer-motion'
import useInkFilter from '../hooks/useInkFilter'

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
  maxScale = 70, maxBlur = 10, octaves = 4,
}: InkRevealProps) {
  const reduceMotion = useReducedMotion()
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin })
  const t = useMotionValue(0)
  const { defs, filter } = useInkFilter(t, { maxScale, maxBlur, octaves })

  useEffect(() => {
    if (!inView) return
    const controls = animate(t, 1, {
      duration: reduceMotion ? 0.3 : duration,
      delay,
      ease: [0.215, 0.61, 0.355, 1], // power3.out — matches the reference
    })
    return () => controls.stop()
  }, [inView, reduceMotion, t, duration, delay])

  const opacity = useTransform(t, [0, reduceMotion ? 1 : 0.12], [0, 1])

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{ ...style, opacity, filter: reduceMotion ? 'none' : filter }}
    >
      {defs}
      {children}
    </motion.div>
  )
}
