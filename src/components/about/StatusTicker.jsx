/**
 * StatusTicker.jsx — Rotating Status line (About bento)
 *
 * Cycles through STATUS_ITEMS (label + value) with a vertical crossfade.
 * Auto-advance pauses on hover and is disabled entirely under
 * prefers-reduced-motion (the first item is shown statically).
 */
import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { STATUS_ITEMS } from '../../data/aboutData'

const ROTATE_MS = 3600

export default function StatusTicker() {
  const [i, setI] = useState(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce || STATUS_ITEMS.length < 2) return
    const id = setInterval(() => {
      if (!pausedRef.current) setI((p) => (p + 1) % STATUS_ITEMS.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [])

  const item = STATUS_ITEMS[i]

  return (
    <div
      className="ab-tile ab-tile-hover flex h-full w-full flex-col px-5 py-3"
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {/* Header — top-left corner */}
      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2 shrink-0" aria-hidden="true">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400/70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
        </span>
        <span
          className="font-sans font-bold uppercase text-cream/45"
          style={{ fontSize: 'var(--text-label)', letterSpacing: '0.22em' }}
        >
          Status
        </span>
      </div>

      {/* Body — centred in the remaining height */}
      <div className="flex flex-1 flex-col justify-center">
        <div className="relative min-h-[1.6em] overflow-hidden" aria-live="polite">
          <AnimatePresence mode="wait">
            <motion.p
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.32, ease: [0.2, 0, 0, 1] }}
              className="font-mono text-cream"
              style={{ fontSize: 'var(--text-body)', lineHeight: 1.35 }}
            >
              <span className="text-cream/55">{item.label}: </span>
              {item.value}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
