import { motion } from 'framer-motion'

/**
 * Reusable scroll-triggered animation wrapper.
 *
 * Props:
 *  - direction  'up' | 'down' | 'left' | 'right'  (default 'up')
 *  - delay      seconds to wait before animating    (default 0)
 *  - duration   animation duration in seconds       (default 0.7)
 *  - distance   how far the element travels in px   (default 60)
 *  - className  forwarded to the wrapper div
 *  - children   content to animate
 *  - as         HTML tag to render (default 'div')
 */
const offsets = {
  up:    { y:  60, x: 0 },
  down:  { y: -60, x: 0 },
  left:  { y: 0,   x:  80 },
  right: { y: 0,   x: -80 },
}

export default function AnimateIn({
  children,
  direction = 'up',
  delay = 0,
  duration = 0.7,
  className = '',
  style,
}) {
  const offset = offsets[direction] || offsets.up

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x, y: offset.y }}
      whileInView={{ opacity: 1, x: 0, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{
        duration,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94], // easeOutQuad — natural deceleration
      }}
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  )
}
