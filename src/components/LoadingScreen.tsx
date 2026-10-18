/**
 * LoadingScreen.tsx — Entry loading veil (riot style)
 *
 * A fixed full-viewport cover that hides the page while the WebGL gradient
 * prewarms and fonts finish loading. Built from the same flat layers as the
 * rest of the site: a two-tone cobalt field split on a diagonal, a halftone
 * band, an ink slash, and the monogram on a cream slab that "ticks" between
 * off-angle poses (a snap, then a hold — never a smooth pulse) above a
 * ransom-note LOADING that reshuffles on every tick.
 *
 * Exit: the whole veil is slashed away left → right with a diagonal
 * clip-path edge (the same move as PageTransition), so it's cheap on phones.
 * Lenis is paused while visible and started on exit.
 * Reduced motion: no ticking, plain opacity fade.
 */
import { useEffect, useState } from 'react'
import { motion, useMotionValue, useTransform, animate, useReducedMotion } from 'framer-motion'
import { useLenisContext } from '../context/LenisContext'
import { RIOT, SNAP, TILT, WIPE_EASE, jagged } from '../style/riot'
import Ransom from './style/Ransom'

const LOGO = '/favicon/logo.svg'

// Minimum display time so the loader never flashes imperceptibly.
const MIN_SHOW_MS = 800
const TICK_MS = 420
const POSES = [-8, 5, -3, 9, -6]

export default function LoadingScreen({ ready }: { ready: boolean }) {
  const reduceMotion = useReducedMotion()
  const lenisRef = useLenisContext()
  const [dismissed, setDismissed] = useState(false)
  const [minTimePassed, setMinTimePassed] = useState(false)
  const [tick, setTick] = useState(0)

  // Enforce minimum display time.
  useEffect(() => {
    const id = setTimeout(() => setMinTimePassed(true), MIN_SHOW_MS)
    return () => clearTimeout(id)
  }, [])

  // Block scroll while the loader is showing.
  useEffect(() => {
    lenisRef?.current?.stop()
  }, [lenisRef])

  const canDismiss = ready && minTimePassed

  // Snap-and-hold ticker for the logo pose + ransom reshuffle.
  useEffect(() => {
    if (reduceMotion || canDismiss) return
    const id = setInterval(() => setTick((n) => n + 1), TICK_MS)
    return () => clearInterval(id)
  }, [reduceMotion, canDismiss])

  // ---- Exit: slash wipe (or fade under reduced motion) ----
  const t = useMotionValue(1) // 1 = fully covering, 0 = gone
  useEffect(() => {
    if (!canDismiss) return
    const controls = animate(t, 0, {
      duration: reduceMotion ? 0.3 : 0.55,
      ease: WIPE_EASE,
      onComplete: () => {
        setDismissed(true)
        lenisRef?.current?.start()
      },
    })
    return () => controls.stop()
  }, [canDismiss, t, reduceMotion, lenisRef])

  // Left edge travels from off-left to off-right; 24% slant.
  const clipPath = useTransform(t, (v) => {
    if (reduceMotion) return 'none'
    const left = -26 + 128 * (1 - v)
    return `polygon(${left + 24}% 0%, 130% 0%, 130% 100%, ${left}% 100%)`
  })
  const opacity = useTransform(t, (v) => (reduceMotion ? v : 1))

  if (dismissed) return null

  return (
    <motion.div
      role="status"
      aria-label="Loading"
      style={{ position: 'fixed', inset: 0, zIndex: 10000, overflow: 'hidden', clipPath, opacity }}
    >
      {/* Field: two flat cobalt tones split on the tilted axis (matches the
          background shader's first frame, so the hand-off is invisible). */}
      <div
        aria-hidden
        style={{
          position: 'absolute',
          inset: 0,
          background: `linear-gradient(${90 + 20}deg, rgb(30,75,210) 0 58%, rgb(20,52,168) 58% 100%)`,
        }}
      />
      {/* Halftone band + ink slash — depth from flat layers */}
      <div
        aria-hidden
        className="halftone"
        style={{
          position: 'absolute',
          inset: '-20%',
          rotate: `${TILT}deg`,
          color: 'rgba(255,255,255,0.14)',
          maskImage: 'linear-gradient(180deg, transparent 30%, #000 45%, #000 55%, transparent 70%)',
          WebkitMaskImage: 'linear-gradient(180deg, transparent 30%, #000 45%, #000 55%, transparent 70%)',
        }}
      />
      <div
        aria-hidden
        style={{
          position: 'absolute',
          left: '-10%',
          width: '120%',
          top: '56%',
          height: '14vh',
          rotate: `${TILT}deg`,
          background: RIOT.ink,
          clipPath: jagged(21, 3),
        }}
      />

      <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
          <motion.div
            animate={{ rotate: POSES[tick % POSES.length], scale: tick % 2 ? 1.06 : 1 }}
            transition={reduceMotion ? { duration: 0 } : SNAP}
            style={{ filter: 'drop-shadow(8px 8px 0 #0F1016)' }}
          >
            <div
              style={{
                width: 108,
                height: 108,
                display: 'grid',
                placeItems: 'center',
                background: RIOT.face,
                clipPath: jagged(tick % 7, 12),
              }}
            >
              <img src={LOGO} alt="" draggable={false} width={56} height={56} style={{ filter: 'invert(1)' }} />
            </div>
          </motion.div>
          <div style={{ fontSize: 'clamp(1.5rem, 3vw, 2.25rem)', rotate: `${TILT}deg` }}>
            <Ransom text="LOADING" seed={reduceMotion ? 1 : tick + 1} color={RIOT.face} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
