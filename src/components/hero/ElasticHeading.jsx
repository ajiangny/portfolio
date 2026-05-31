import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'

const LETTERS = 'Portfolio'.split('')
const OFF = -9999

function ElasticLetter({ char, mouseX, mouseY }) {
  const ref = useRef(null)

  const rawX = useTransform([mouseX, mouseY], ([mx, my]) => {
    const el = ref.current
    if (!el || mx === OFF) return 0
    const r  = el.getBoundingClientRect()
    const cx = r.left + r.width  / 2
    const cy = r.top  + r.height / 2
    const dx = mx - cx
    const dy = my - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const RADIUS = 140
    if (dist >= RADIUS || dist === 0) return 0
    return -(dx / dist) * Math.pow(1 - dist / RADIUS, 1.6) * 60
  })

  const rawY = useTransform([mouseX, mouseY], ([mx, my]) => {
    const el = ref.current
    if (!el || mx === OFF) return 0
    const r  = el.getBoundingClientRect()
    const cx = r.left + r.width  / 2
    const cy = r.top  + r.height / 2
    const dx = mx - cx
    const dy = my - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const RADIUS = 140
    if (dist >= RADIUS || dist === 0) return 0
    return -(dy / dist) * Math.pow(1 - dist / RADIUS, 1.6) * 60
  })

  const x = useSpring(rawX, { stiffness: 120, damping: 10, mass: 0.08 })
  const y = useSpring(rawY, { stiffness: 120, damping: 10, mass: 0.08 })

  return (
    <motion.span ref={ref} style={{ x, y, display: 'inline-block' }}>
      {char}
    </motion.span>
  )
}

export default function ElasticHeading() {
  const mouseX = useMotionValue(OFF)
  const mouseY = useMotionValue(OFF)

  return (
    <div
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY) }}
      onMouseLeave={() => { mouseX.set(OFF); mouseY.set(OFF) }}
    >
      <h1
        className="font-display text-cobalt leading-none select-none"
        style={{ fontSize: 'clamp(3rem, 13vw, 14rem)', letterSpacing: '-0.01em' }}
      >
        {LETTERS.map((char, i) => (
          <ElasticLetter key={i} char={char} mouseX={mouseX} mouseY={mouseY} />
        ))}
      </h1>
    </div>
  )
}
