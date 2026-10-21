/**
 * SpotifyPrompt.tsx — "full songs or previews?" before the first Spotify play
 *
 * Logged-out visitors only get 30-second previews from Spotify's embed, and
 * the embed has no volume control. So the first time a visitor presses play
 * we ask, riot style: log in with Spotify Premium (a popup, spotifyAuth.ts;
 * the page then plays through the Web Playback SDK, full songs on the Music
 * slider) or skip to previews that follow the device volume. The answer is
 * remembered, so it's asked once per browser.
 *
 * Without a Client ID on the server it falls back to the old flow: Spotify's
 * login opens in a tab and "I'm logged in" reloads the embed.
 *
 * `notice` reopens it to explain a fallback (the account isn't Premium, or
 * Spotify refused it) before previews play.
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
import { getClientId, login as sdkLogin } from './spotifyAuth'

const LOGIN_URL = `https://accounts.spotify.com/login?continue=${encodeURIComponent('https://open.spotify.com/')}`

interface Props {
  open: boolean
  /** Logged in: viaSdk = Premium login done here, else reload the embed. Then play. */
  onLoggedIn: (viaSdk: boolean) => void
  /** Why the Premium player couldn't be used; shown before previews play. */
  notice?: string | null
  /** Play previews as-is. */
  onSkip: () => void
  /** Dismissed without choosing (Esc / backdrop): don't play. */
  onCancel: () => void
}

type Step = 'ask' | 'connecting' | 'failed' | 'waiting'
interface Btn { label: string; sub: string; onClick: () => void; bg: string; fg: string; seed: number }

export default function SpotifyPrompt({ open, onLoggedIn, notice, onSkip, onCancel }: Props) {
  const [step, setStep] = useState<Step>('ask')
  // Known before the click: the popup must open inside the gesture.
  const [sdk, setSdk] = useState(false)
  useEffect(() => { if (open) void getClientId().then((id) => setSdk(!!id)) }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') { setStep('ask'); onCancel() } }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onCancel])

  const login = () => {
    sfx.confirm()
    if (!sdk) {
      remember('login')
      window.open(LOGIN_URL, '_blank', 'noopener')
      setStep('waiting')
      return
    }
    setStep('connecting')
    void sdkLogin().then((ok) => {
      if (!ok) { setStep('failed'); return }
      remember('login')
      setStep('ask')
      onLoggedIn(true)
    })
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
    onLoggedIn(false)
  }

  const previews: Btn = { label: 'Play previews', sub: '30s each · device volume', onClick: skip, bg: RIOT.cobalt, fg: RIOT.face, seed: 74 }
  const copy: Record<Step | 'notice', { title: string; body: string; buttons: Btn[] }> = {
    ask: {
      title: 'Want the full songs?',
      body: sdk
        ? "Log in with Spotify Premium to hear every track in full, with its volume on the Music slider in Settings. If you skip, you'll hear 30-second previews, and Spotify's sound only follows your device volume."
        : "Spotify only plays 30-second previews unless you're logged in. Log in to hear every track in full, or skip and listen to the previews. Either way, Spotify's sound only follows your device volume.",
      buttons: [
        { label: sdk ? 'Log in with Premium' : 'Log in to Spotify', sub: sdk ? 'full songs · volume slider' : 'full songs', onClick: login, bg: RIOT.face, fg: RIOT.ink, seed: 71 },
        { ...previews, label: 'Skip', seed: 72 },
      ],
    },
    connecting: {
      title: 'Finish in the Spotify window',
      body: "Log in in the window that just opened. The music starts here as soon as you're done.",
      buttons: [previews],
    },
    failed: {
      title: "Login didn't finish",
      body: "The Spotify window closed before the login went through, or your browser blocked it. Try again, or play the previews, whose sound follows your device volume.",
      buttons: [{ label: 'Try again', sub: 'opens Spotify', onClick: login, bg: RIOT.face, fg: RIOT.ink, seed: 75 }, previews],
    },
    waiting: {
      title: 'Log in, then come back',
      body: "Spotify opened in a new tab. Once you've logged in there, come back and press play.",
      buttons: [{ label: "I'm logged in, play", sub: 'reloads the player', onClick: loggedIn, bg: RIOT.face, fg: RIOT.ink, seed: 73 }, previews],
    },
    notice: {
      title: 'Playing previews instead',
      body: `${notice ?? ''} You'll hear 30-second previews, and Spotify's sound follows your device volume.`,
      buttons: [{ ...previews, label: 'OK, play previews', bg: RIOT.face, fg: RIOT.ink }],
    },
  }
  const view = copy[notice ? 'notice' : step]
  const buttons = view.buttons

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          key="spotify-prompt"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spotify-prompt-title"
          onClick={() => { setStep('ask'); onCancel() }}
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
                {view.title}
              </h2>
              <p className="font-mono" style={{ fontSize: 'var(--text-meta)', lineHeight: 1.6, opacity: 0.85 }}>
                {view.body}
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
