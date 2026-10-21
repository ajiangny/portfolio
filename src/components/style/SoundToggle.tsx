/**
 * SoundToggle.tsx — the visible on/off switch (and volume) for site sound
 *
 * A small slab tag pinned bottom-right. Sound starts OFF (browsers block
 * audio before a user gesture, and nobody likes a portfolio that shouts);
 * the visitor's choice persists via style/sfx. The tag itself follows the
 * costume-change rule: ON is the inverted, cobalt state with moving bars.
 * While sound is on, a volume slab slides out beside it; it scales the SFX
 * and the background music together (sfx.setVolume, remembered). Spotify's
 * embed exposes no volume, so it plays at the visitor's system volume.
 */
import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { SNAP, jagged } from '../../style/riot'
import { getVolume, isSoundOn, onSoundChange, onVolumeChange, setSound, setVolume } from '../../style/sfx'

export default function SoundToggle() {
  const [on, setOn] = useState(isSoundOn)
  useEffect(() => onSoundChange(setOn), [])
  const [vol, setVol] = useState(getVolume)
  useEffect(() => onVolumeChange(setVol), [])

  return (
    <div
      style={{
        position: 'fixed',
        right: 20,
        bottom: 20,
        zIndex: 210,
        rotate: '-6deg',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
      }}
    >
    <AnimatePresence>
      {on && (
        <motion.label
          key="volume"
          initial={{ opacity: 0, x: 24, scaleX: 0.4 }}
          animate={{ opacity: 1, x: 0, scaleX: 1 }}
          exit={{ opacity: 0, x: 24, scaleX: 0.4 }}
          transition={SNAP}
          style={{
            originX: 1,
            display: 'flex',
            alignItems: 'center',
            padding: '9px 12px',
            background: 'var(--color-slab)',
            clipPath: jagged(5, 9),
            filter: 'drop-shadow(4px 4px 0 var(--color-riot))',
          }}
        >
          <span className="sr-only">Volume</span>
          <input
            type="range"
            className="riot-range"
            min={0}
            max={100}
            step={1}
            value={Math.round(vol * 100)}
            onChange={(e) => setVolume(Number(e.target.value) / 100)}
            aria-valuetext={`${Math.round(vol * 100)}%`}
            style={{ '--fill': `${vol * 100}%` } as React.CSSProperties}
          />
        </motion.label>
      )}
    </AnimatePresence>
    <motion.button
      type="button"
      onClick={() => setSound(!on)}
      aria-pressed={on}
      aria-label={on ? 'Turn sound off' : 'Turn sound on'}
      whileHover={{ rotate: -10, scale: 1.08 }}
      transition={SNAP}
      className="font-sans font-bold uppercase"
      style={{
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
    </div>
  )
}
