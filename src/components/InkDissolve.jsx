/**
 * InkDissolve.jsx — one-shot ink-dissolve reveal (ref: kaiseisadatoki-v4
 * "ink-anim")
 *
 * Wraps content in the shared ink filter (hooks/useInkFilter.jsx) and fires it
 * once when scrolled into view: content fades in fast (~12% of the settle),
 * then the turbulence displacement + blur resolve over `duration`, reading as
 * ink settling onto the page. Reduced motion → quick plain fade, no filter.
 *
 * For scroll-scrubbed dissolves drive useInkFilter directly.
 */
import { useRef, useEffect } from 'react'
import { motion, useMotionValue, useTransform, useInView, useReducedMotion, animate } from 'framer-motion'
import useInkFilter from '../hooks/useInkFilter'

export default function InkReveal({
  children, className, style,
  duration = 1.8, delay = 0, margin = '-120px',
  maxScale = 70, maxBlur = 10, octaves = 4,
}) {
  const reduceMotion = useReducedMotion()
  const ref = useRef(null)
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
