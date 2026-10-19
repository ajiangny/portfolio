/**
 * SoundToggle.tsx — the visible on/off switch for the riot sound effects
 *
 * A small slab tag pinned bottom-right. Sound starts OFF (browsers block
 * audio before a user gesture, and nobody likes a portfolio that shouts);
 * the visitor's choice persists via style/sfx. The tag itself follows the
 * costume-change rule: ON is the inverted, cobalt state with moving bars.
 */
import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { SNAP, jagged } from '../../style/riot'
import { isSoundOn, onSoundChange, setSound } from '../../style/sfx'

export default function SoundToggle() {
  const [on, setOn] = useState(isSoundOn)
  useEffect(() => onSoundChange(setOn), [])

  return (
    <motion.button
      type="button"
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? 'Turn sound effects off' : 'Turn sound effects on'}
      whileHover={{ rotate: -10, scale: 1.08 }}
      transition={SNAP}
      className="font-sans font-bold uppercase"
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 210,
        rotate: -6,
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 16px',
        border: 'none',
        background: on ? 'var(--color-riot)' : 'var(--color-cream)',
        color: on ? 'var(--color-cream)' : 'var(--color-slab)',
        letterSpacing: '0.18em',
        fontSize: 'var(--text-label)',
        clipPath: jagged(3, 9),
        filter: 'drop-shadow(4px 4px 0 #0F1016)',
        cursor: 'pointer',
      }}
    >
      {/* Three bars: flat when off, bouncing (CSS .ab-eq) when on */}
      <span className={on ? 'ab-eq' : undefined} aria-hidden style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 2, height: 11 }}>
        {[0.4, 0.9, 0.6].map((h, i) => (
          <span key={i} style={{ width: 2, height: on ? undefined : `${h * 100}%`, background: 'currentColor' }} />
        ))}
      </span>
      Sound {on ? 'on' : 'off'}
    </motion.button>
  )
}
