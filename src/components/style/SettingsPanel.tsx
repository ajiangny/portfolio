/**
 * SettingsPanel.tsx — the game menu's Settings screen (sound)
 *
 * Opened from the "Settings" entry in StyleMenu. Same riot rules as the menu
 * list: rows sit on the tilted axis and stair-step, the selected row wears
 * the white-on-ink slab, and everything answers to the keyboard like a game
 * options screen: ↑↓ pick a row, ←→ change it, Esc goes back to the list.
 *
 * Rows: Sound (on/off, same switch as the nav bar's speaker), Music (the
 * background track's volume, style/music.ts) and Effects (UI sounds,
 * style/sfx.ts). Both volumes are remembered. Spotify has no volume API, so
 * it isn't on here.
 */
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import useMediaQuery from '../../hooks/useMediaQuery'
import { RIOT, SNAP, ENTER_EASE, jagged } from '../../style/riot'
import Ransom from './Ransom'
import * as sfx from '../../style/sfx'
import { getMusicVolume, onMusicVolumeChange, setMusicVolume } from '../../style/music'

const TILT = -9   // matches the menu list
const STEP_X = 4  // vw each row shifts right of the one above it (halved on phones)
const STEP = 0.1  // ←→ volume step

type Row = 'sound' | 'music' | 'effects'
const ROWS: Row[] = ['sound', 'music', 'effects']
const LABEL: Record<Row, string> = { sound: 'Sound', music: 'Music', effects: 'Effects' }

export default function SettingsPanel({ onBack }: { onBack: () => void }) {
  const narrow = useMediaQuery('(max-width: 767px)')
  const stepX = narrow ? STEP_X / 2 : STEP_X
  const [active, setActive] = useState(0)
  const [on, setOn] = useState(sfx.isSoundOn)
  const [music, setMusic] = useState(getMusicVolume)
  const [effects, setEffects] = useState(sfx.getVolume)
  useEffect(() => sfx.onSoundChange(setOn), [])
  useEffect(() => onMusicVolumeChange(setMusic), [])
  useEffect(() => sfx.onVolumeChange(setEffects), [])

  const select = useCallback((i: number) => {
    const next = (i + ROWS.length) % ROWS.length
    if (next === active) return
    setActive(next)
    sfx.tick(next)
  }, [active])

  const nudge = useCallback((row: Row, dir: 1 | -1) => {
    if (row === 'sound') { sfx.setSound(!sfx.isSoundOn()); return }
    if (row === 'music') setMusicVolume(getMusicVolume() + dir * STEP)
    else { sfx.setVolume(sfx.getVolume() + dir * STEP); sfx.tick(Math.round(sfx.getVolume() * 7)) }
  }, [])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.closest('input[type="range"]') && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) return
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); onBack() }
      else if (e.key === 'ArrowDown') { e.preventDefault(); select(active + 1) }
      else if (e.key === 'ArrowUp') { e.preventDefault(); select(active - 1) }
      else if (e.key === 'ArrowRight') { e.preventDefault(); nudge(ROWS[active], 1) }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); nudge(ROWS[active], -1) }
      else if (e.key === 'Enter' && ROWS[active] === 'sound') { e.preventDefault(); nudge('sound', 1) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, onBack, select, nudge])

  const value = (row: Row) => row === 'music' ? music : effects

  return (
    <div
      style={{
        position: 'absolute',
        left: '8vw',
        top: '50%',
        translate: '0 -50%',
        rotate: `${TILT}deg`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'clamp(0.8rem, 2.4vh, 1.6rem)',
      }}
    >
      <motion.div
        initial={{ x: '40vw', skewX: -30, opacity: 0 }}
        animate={{ x: 0, skewX: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: ENTER_EASE }}
        style={{ fontSize: 'clamp(2.25rem, 6vw, 5.5rem)', lineHeight: 1, marginBottom: '0.4rem' }}
      >
        <Ransom text="SETTINGS" seed={9} color={RIOT.face} />
      </motion.div>

      {ROWS.map((row, i) => {
        const isActive = i === active
        const fg = isActive ? RIOT.ink : RIOT.face
        return (
          <motion.div
            key={row}
            initial={{ x: '50vw', skewX: -30, opacity: 0 }}
            animate={{ x: `${i * stepX}vw`, skewX: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: ENTER_EASE, delay: 0.06 + i * 0.045 }}
            onMouseEnter={() => select(i)}
            onFocusCapture={() => select(i)}
            style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 'clamp(1rem, 3vw, 2.5rem)', padding: '0.5rem 1rem' }}
          >
            {isActive && (
              <motion.span
                layoutId="settings-highlight"
                transition={SNAP}
                aria-hidden
                style={{ position: 'absolute', inset: 0, zIndex: 0 }}
              >
                <span style={{ position: 'absolute', inset: 0, transform: 'translate(8px, 7px) skewX(-14deg)', background: RIOT.ink, clipPath: jagged(i * 5 + 81, 6) }} />
                <span style={{ position: 'absolute', inset: 0, transform: 'skewX(-14deg)', background: RIOT.face, clipPath: jagged(i * 5 + 82, 6) }} />
              </motion.span>
            )}
            <span
              id={`settings-${row}`}
              className="font-display uppercase"
              style={{ position: 'relative', zIndex: 1, width: '4.2em', color: fg, fontSize: 'clamp(1.25rem, 3.4vw, 3rem)', lineHeight: 1, textShadow: isActive ? 'none' : `0.05em 0.05em 0 ${RIOT.ink}` }}
            >
              {LABEL[row]}
            </span>

            {row === 'sound' ? (
              <button
                type="button"
                onClick={() => nudge('sound', 1)}
                aria-pressed={on}
                aria-labelledby="settings-sound"
                className="font-display uppercase"
                style={{
                  position: 'relative',
                  zIndex: 1,
                  padding: '8px 16px 6px',
                  border: 'none',
                  // On: a solid ink chip. Off: just an outline in the row's text colour.
                  background: on ? RIOT.ink : 'transparent',
                  color: on ? RIOT.face : fg,
                  boxShadow: on ? 'none' : 'inset 0 0 0 2px currentColor',
                  fontSize: 'clamp(1rem, 1.8vw, 1.4rem)',
                  lineHeight: 1,
                  clipPath: jagged(91, 8),
                  cursor: 'pointer',
                }}
              >
                {on ? 'On' : 'Off'}
              </button>
            ) : (
              <span style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', gap: 14, background: RIOT.ink, padding: '10px 22px 10px 14px', clipPath: jagged(i * 7 + 93, 6), opacity: on ? 1 : 0.55 }}>
                <input
                  type="range"
                  className="riot-range riot-range-lg"
                  min={0}
                  max={100}
                  step={1}
                  value={Math.round(value(row) * 100)}
                  onChange={(e) => {
                    const v = Number(e.target.value) / 100
                    if (row === 'music') setMusicVolume(v)
                    else sfx.setVolume(v)
                  }}
                  onPointerUp={() => { if (row === 'effects') sfx.tick(Math.round(sfx.getVolume() * 7)) }}
                  aria-labelledby={`settings-${row}`}
                  aria-valuetext={`${Math.round(value(row) * 100)}%`}
                  style={{ '--fill': `${value(row) * 100}%` } as React.CSSProperties}
                />
                <span className="font-mono" style={{ color: RIOT.face, fontSize: 'var(--text-label)', width: '3ch', textAlign: 'right' }}>
                  {Math.round(value(row) * 100)}
                </span>
              </span>
            )}
          </motion.div>
        )
      })}

      <motion.button
        type="button"
        onClick={onBack}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.25 }}
        className="font-mono uppercase"
        style={{
          alignSelf: 'flex-start',
          marginTop: '0.6rem',
          marginLeft: `${ROWS.length * stepX}vw`,
          background: RIOT.face,
          color: RIOT.cobalt,
          border: 'none',
          padding: '4px 12px',
          fontSize: 'var(--text-label)',
          letterSpacing: '0.14em',
          clipPath: jagged(97, 10),
          cursor: 'pointer',
        }}
      >
        ← Back
      </motion.button>
    </div>
  )
}
