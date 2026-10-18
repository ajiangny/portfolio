/**
 * Ransom.tsx — ransom-note lettering (rule 4: selection is a costume change)
 *
 * Each letter picks its own font, tilt, size and sometimes an inverted ink
 * box, from a seeded PRNG: the same seed always renders the same note, and
 * changing the seed reshuffles it in place with a spring (StyleMenu re-rolls
 * on every selection, the loader on every tick).
 * The first letter stays plain and larger so the word still reads at a glance.
 */
import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { RIOT, SNAP, jagged, rng } from '../../style/riot'

const LETTER_FONTS = ['var(--font-display)', 'var(--font-sans)', 'var(--font-mono)']

export default function Ransom({
  text, seed, color = RIOT.cobalt, boxRate = 0.28,
}: { text: string; seed: number; color?: string; boxRate?: number }) {
  const letters = useMemo(() => {
    const r = rng(seed)
    return [...text].map((ch, i) => ({
      ch,
      font: LETTER_FONTS[Math.floor(r() * LETTER_FONTS.length)],
      rotate: (r() - 0.5) * 16,
      y: (r() - 0.5) * 0.18,
      scale: i === 0 ? 1.3 : 0.85 + r() * 0.3,
      boxed: i > 0 && ch !== ' ' && r() < boxRate,
    }))
  }, [text, seed, boxRate])

  return (
    <span aria-label={text} role="img" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.02em' }}>
      {letters.map((l, i) => (
        <motion.span
          key={i}
          aria-hidden
          initial={{ scale: 0, rotate: l.rotate * 3 }}
          animate={{ scale: l.scale, rotate: l.rotate }}
          transition={{ ...SNAP, delay: i * 0.018 }}
          style={{
            display: 'inline-block',
            fontFamily: l.font,
            fontWeight: 800,
            lineHeight: 1,
            whiteSpace: 'pre',
            translateY: `${l.y}em`,
            padding: l.boxed ? '0.04em 0.1em' : 0,
            background: l.boxed ? RIOT.ink : 'transparent',
            color: l.boxed ? RIOT.face : color,
            clipPath: l.boxed ? jagged(seed + i, 10) : undefined,
          }}
        >
          {l.ch}
        </motion.span>
      ))}
    </span>
  )
}
