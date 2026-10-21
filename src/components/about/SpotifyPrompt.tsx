/**
 * SpotifyPrompt.tsx — "full songs or previews?" before the first Spotify play
 *
 * The hidden embed only streams full tracks to a browser that's logged in to
 * Spotify; everyone else gets 30-second previews. So the first time a visitor
 * presses play we ask, riot style: log in (Spotify opens in a new tab; when
 * they come back, "I'm logged in" reloads the player and plays) or skip and
 * hear previews. The answer is remembered, so it's asked once per browser.
 *
 * Portalled to <body>: the About tiles are transformed, which would trap a
 * position:fixed overlay inside the tile.
 */
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { RIOT, SNAP, TILT, ENTER_EASE, jagged } from '../../style/riot'
import * as sfx from '../../style/sfx'
import { rememberSpotifyChoice as remember } from './spotifyChoice'

const LOGIN_URL = `https://accounts.spotify.com/login?continue=${encodeURIComponent('https://open.spotify.com/')}`

interface Props {
  open: boolean
  /** Reload the player (to pick up a fresh login) and play. */
  onLoggedIn: () => void
  /** Play previews as-is. */
  onSkip: () => void
  /** Dismissed without choosing (Esc / backdrop): don't play. */
  onCancel: () => void
}

export default function SpotifyPrompt({ open, onLoggedIn, onSkip, onCancel }: Props) {
  const [step, setStep] = useState<'ask' | 'waiting'>('ask')

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  const login = () => {
    sfx.confirm()
    remember('login')
    window.open(LOGIN_URL, '_blank', 'noopener')
    setStep('waiting')
  }
  const skip = () => {
    sfx.confirm()
    remember('skip')
    setStep('ask')
    onSkip()
  }
  const loggedIn = () => {
    sfx.confirm()
    setStep('ask')
    onLoggedIn()
  }

  const buttons = step === 'ask'
    ? [
        { label: 'Log in to Spotify', sub: 'full songs', onClick: login, bg: RIOT.face, fg: RIOT.ink, seed: 71 },
        { label: 'Skip', sub: '30s previews', onClick: skip, bg: RIOT.cobalt, fg: RIOT.face, seed: 72 },
      ]
    : [
        { label: "I'm logged in, play", sub: 'reloads the player', onClick: loggedIn, bg: RIOT.face, fg: RIOT.ink, seed: 73 },
        { label: 'Play previews', sub: '30s each', onClick: skip, bg: RIOT.cobalt, fg: RIOT.face, seed: 74 },
      ]

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="spotify-prompt"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spotify-prompt-title"
          onClick={onCancel}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9500, // over the header and menu, under the cursor
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(15, 16, 22, 0.72)',
            padding: 20,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ x: -80, skewX: -14, opacity: 0 }}
            animate={{ x: 0, skewX: 0, opacity: 1 }}
            exit={{ x: 80, skewX: 10, opacity: 0 }}
            transition={{ duration: 0.32, ease: ENTER_EASE }}
            style={{ rotate: `${TILT}deg`, filter: 'drop-shadow(10px 10px 0 var(--color-riot))', maxWidth: 560, width: '100%' }}
          >
            <div
              style={{
                background: RIOT.ink,
                color: RIOT.face,
                padding: 'clamp(22px, 4vw, 36px)',
                clipPath: jagged(70, 3),
                display: 'flex',
                flexDirection: 'column',
                gap: 18,
              }}
            >
              <span
                className="font-mono uppercase"
                style={{ alignSelf: 'flex-start', background: '#1ed760', color: RIOT.ink, padding: '4px 10px', fontSize: 'var(--text-label)', letterSpacing: '0.18em', clipPath: jagged(75, 8) }}
              >
                Spotify
              </span>
              <h2 id="spotify-prompt-title" className="font-display uppercase" style={{ fontSize: 'clamp(1.6rem, 4vw, 2.4rem)', lineHeight: 1 }}>
                {step === 'ask' ? 'Want the full songs?' : 'Log in, then come back'}
              </h2>
              <p className="font-mono" style={{ fontSize: 'var(--text-meta)', lineHeight: 1.6, opacity: 0.85 }}>
                {step === 'ask'
                  ? "Spotify only plays 30-second previews unless you're logged in. Log in to hear every track in full, or skip and listen to the previews."
                  : "Spotify opened in a new tab. Once you've logged in there, come back and press play."}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 4 }}>
                {buttons.map((b) => (
                  <motion.button
                    key={b.label}
                    type="button"
                    onClick={b.onClick}
                    whileHover={{ rotate: -4, scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    transition={SNAP}
                    className="font-display uppercase"
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      gap: 4,
                      padding: '12px 18px 10px',
                      border: 'none',
                      background: b.bg,
                      color: b.fg,
                      fontSize: 'clamp(0.95rem, 1.6vw, 1.15rem)',
                      lineHeight: 1,
                      clipPath: jagged(b.seed, 6),
                      cursor: 'pointer',
                    }}
                  >
                    {b.label}
                    <span className="font-mono normal-case" style={{ fontSize: 11, opacity: 0.75, letterSpacing: '0.04em' }}>{b.sub}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
