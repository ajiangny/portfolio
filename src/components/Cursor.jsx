/**
 * Cursor.jsx — custom dot cursor (fine-pointer devices only)
 *
 * A small white dot with mix-blend-difference tracks the pointer 1:1, so it
 * self-inverts over light surfaces. Over interactive elements (links, buttons,
 * form fields, sliders) it spring-scales up. Over [data-cursor-label] targets
 * the dot swaps to a solid cream pill revealing the label text.
 *
 * Mounted once in App. Adds `has-custom-cursor` to <html>, which hides the
 * native cursor via index.css. Position is set directly on motion values
 * (no re-render, zero lag); only the hover STATE changes go through React.
 */
import { useEffect, useState } from 'react'
import { motion, useMotionValue, AnimatePresence } from 'framer-motion'

const DOT = 10 // px — resting dot diameter
const INTERACTIVE =
  'a, button, input, textarea, select, [role="button"], [role="slider"], [data-cursor-label]'

export default function Cursor() {
  const [enabled, setEnabled] = useState(false)
  const [visible, setVisible] = useState(false)
  const [clickable, setClickable] = useState(false)
  const [label, setLabel] = useState(null)
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)

  // Mouse/trackpad present? (re-checked live — hybrid tablets can dock/undock)
  useEffect(() => {
    const mq = window.matchMedia('(pointer: fine)')
    const sync = () => setEnabled(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (!enabled) return
    document.documentElement.classList.add('has-custom-cursor')

    const onMove = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
      setVisible(true)

      const t = e.target instanceof Element ? e.target : null
      const labelEl = t?.closest('[data-cursor-label]')
      setLabel(labelEl?.getAttribute('data-cursor-label') ?? null)
      setClickable(!!t?.closest(INTERACTIVE))
    }
    const onLeave = () => setVisible(false)

    window.addEventListener('mousemove', onMove, { passive: true })
    document.documentElement.addEventListener('mouseleave', onLeave)
    return () => {
      document.documentElement.classList.remove('has-custom-cursor')
      window.removeEventListener('mousemove', onMove)
      document.documentElement.removeEventListener('mouseleave', onLeave)
    }
  }, [enabled, x, y])

  if (!enabled) return null

  // The dot and pill are SIBLING fixed elements sharing the x/y motion values.
  // The blend must live on the transformed element itself: a transformed
  // ANCESTOR creates a stacking context that isolates mix-blend-mode from the
  // page, killing the inversion.
  return (
    <>
      {/* Blend dot — difference against the page inverts it over light surfaces */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none fixed left-0 top-0 z-9999 rounded-full bg-white"
        style={{
          x,
          y,
          width: DOT,
          height: DOT,
          marginLeft: -DOT / 2,
          marginTop: -DOT / 2,
          mixBlendMode: 'difference',
        }}
        animate={{
          scale: label ? 0.5 : clickable ? 2.2 : 1,
          opacity: visible && !label ? 1 : 0,
        }}
        transition={{ type: 'spring', stiffness: 550, damping: 35 }}
      />

      {/* Label pill — solid (no blend) so the text stays readable anywhere.
          Its top-left corner sits exactly on the pointer, and the dot hides
          while it's up — the pill IS the cursor. */}
      <AnimatePresence>
        {label && visible && (
          <motion.div
            key={label}
            aria-hidden="true"
            className="pointer-events-none fixed left-0 top-0 z-9999 whitespace-nowrap rounded-full font-sans font-bold"
            style={{
              x,
              y,
              transformOrigin: 'top left',
              background: 'var(--color-cream)',
              color: '#080c28',
              padding: '7px 14px',
              fontSize: 12,
              letterSpacing: '0.04em',
            }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 450, damping: 30 }}
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
