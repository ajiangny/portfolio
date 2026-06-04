import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useAnimationFrame } from 'framer-motion'

const OFF = -9999

function ElasticLetter({ char, index, mouseX, mouseY, waveEffect }) {
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

  const waveY = useMotionValue(0)
  useAnimationFrame((t) => {
    if (waveEffect) {
      const period = 4000
      const waveSpeed = 50
      const waveDuration = 600
      const localTime = (t % period) - (index * waveSpeed)
      
      let offset = 0
      if (localTime > 0 && localTime < waveDuration) {
        offset = -Math.sin((localTime / waveDuration) * Math.PI) * 20
      }
      waveY.set(offset)
    }
  })

  const finalY = useTransform([y, waveY], ([yv, wv]) => yv + wv)

  return (
    <motion.span ref={ref} style={{ x, y: finalY, display: 'inline-block', whiteSpace: 'pre' }}>
      {char}
    </motion.span>
  )
}

export default function ElasticHeading({ 
  text = "Portfolio", 
  className = "font-display text-cobalt leading-none select-none", 
  style = { fontSize: 'clamp(3rem, 13vw, 14rem)', letterSpacing: '-0.01em' },
  as: Tag = 'h1',
  waveEffect = false
}) {
  const mouseX = useMotionValue(OFF)
  const mouseY = useMotionValue(OFF)
  const letters = text.split('')

  return (
    <div
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY) }}
      onMouseLeave={() => { mouseX.set(OFF); mouseY.set(OFF) }}
      style={{ display: 'inline-block', pointerEvents: 'auto' }}
    >
      <Tag className={className} style={style}>
        {letters.map((char, i) => (
          <ElasticLetter key={i} index={i} char={char} mouseX={mouseX} mouseY={mouseY} waveEffect={waveEffect} />
        ))}
      </Tag>
    </div>
  )
}
