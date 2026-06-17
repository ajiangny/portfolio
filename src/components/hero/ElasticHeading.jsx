/**
 * ElasticHeading.jsx — Mouse-Repulsive Typography
 *
 * Renders a heading where each letter independently reacts to the mouse
 * cursor — letters within a radius are "pushed" away with spring physics,
 * creating a fluid elastic repulsion effect.
 *
 * Optional `waveEffect` adds a looping vertical wave animation where
 * letters bob up in sequence (used in the About heading).
 */
import { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, useAnimationFrame } from 'framer-motion'


const OFF = -9999

function ElasticLetter({ char, index, mouseX, mouseY, waveEffect, letterStyle }) {
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
    <motion.span ref={ref} style={{ x, y: finalY, display: 'inline-block', whiteSpace: 'pre', ...letterStyle }}>
      {char}
    </motion.span>
  )
}

export default function ElasticHeading({
  text = "Portfolio",
  className = "font-display text-cobalt leading-none select-none",
  style = { fontSize: 'var(--text-hero)', letterSpacing: '-0.01em' },
  as: Tag = 'h1',
  waveEffect = false,
  ariaLabel,        // override the heading's accessible name (defaults to `text`)
  letterStyle,      // optional per-glyph style (Hero passes the liquid-glass fill)
}) {
  const mouseX = useMotionValue(OFF)
  const mouseY = useMotionValue(OFF)

  // Group letters into words so line-wrapping happens between words,
  // not between arbitrary letters. Letter indices stay global so the
  // wave animation sweeps continuously across the whole heading.
  const words = []
  let letterIndex = 0
  for (const word of text.split(' ')) {
    words.push({ word, start: letterIndex })
    letterIndex += word.length + 1
  }

  return (
    <div
      onMouseMove={(e) => { mouseX.set(e.clientX); mouseY.set(e.clientY) }}
      onMouseLeave={() => { mouseX.set(OFF); mouseY.set(OFF) }}
      style={{ display: 'inline-block', pointerEvents: 'auto' }}
    >
      <Tag className={className} style={style} aria-label={ariaLabel ?? text}>
        <span aria-hidden="true">
          {words.map(({ word, start }, w) => (
            <span key={w}>
              <span style={{ display: 'inline-block', whiteSpace: 'nowrap' }}>
                {word.split('').map((char, i) => (
                  <ElasticLetter key={i} index={start + i} char={char} mouseX={mouseX} mouseY={mouseY} waveEffect={waveEffect} letterStyle={letterStyle} />
                ))}
              </span>
              {w < words.length - 1 && ' '}
            </span>
          ))}
        </span>
      </Tag>
    </div>
  )
}
