/**
 * sfx.ts — Synthesized UI sound effects for the riot style
 *
 * Every sound is generated live with the Web Audio API (oscillators + filtered
 * noise), so there are no audio files to load or license. The sounds follow
 * the same rules as the visuals:
 *   • short and punchy, with a hard attack and a fast decay (rule 5 — snap,
 *     then silence; nothing swells or lingers)
 *   • a tiny, consistent palette: one "tick" for moving the selection, one
 *     "confirm" for committing, one "slash" family for open/close/wipes
 *     (rule 1 — few elements, each with one job)
 *   • the selection tick is pitched per item, so moving through a list plays
 *     a little scale (rule 4 — selection is an event you can hear)
 *
 * Sound is OFF until the visitor turns it on (browsers block audio before a
 * user gesture anyway); the choice is remembered in localStorage. The
 * AudioContext is created lazily on the enabling click.
 */

type Listener = (on: boolean) => void

const STORAGE_KEY = 'riot-sound'
let enabled = false
let ctx: AudioContext | null = null
let master: GainNode | null = null
let noiseBuf: AudioBuffer | null = null
const listeners = new Set<Listener>()

try {
  enabled = localStorage.getItem(STORAGE_KEY) === 'on'
} catch { /* storage blocked — stay off */ }

function audio() {
  if (!enabled) return null
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!AC) return null
    ctx = new AC()
    master = ctx.createGain()
    master.gain.value = 0.32
    master.connect(ctx.destination)
    // One second of white noise, reused by every slash/click.
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
    const d = noiseBuf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  }
  if (ctx.state === 'suspended') void ctx.resume()
  return ctx
}

export function isSoundOn() { return enabled }

export function setSound(on: boolean) {
  enabled = on
  try { localStorage.setItem(STORAGE_KEY, on ? 'on' : 'off') } catch { /* ignore */ }
  listeners.forEach((fn) => fn(on))
  if (on) confirm() // audible proof it worked (and unlocks the context)
}

/** Subscribe to on/off changes; returns the unsubscribe function. */
export function onSoundChange(fn: Listener) {
  listeners.add(fn)
  return () => { listeners.delete(fn) }
}

// ── Building blocks ──

// A pitched blip: hard attack, exponential decay, optional pitch drop.
function blip(type: OscillatorType, from: number, to: number, dur: number, gain: number, delay = 0) {
  const c = audio()
  if (!c || !master) return
  const t = c.currentTime + delay
  const o = c.createOscillator()
  const g = c.createGain()
  o.type = type
  o.frequency.setValueAtTime(from, t)
  o.frequency.exponentialRampToValueAtTime(to, t + dur)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + 0.004)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.connect(g).connect(master)
  o.start(t)
  o.stop(t + dur + 0.02)
}

// A noise burst through a band-pass filter whose centre sweeps — the "slash".
function sweep(fromHz: number, toHz: number, dur: number, gain: number, q = 1.2) {
  const c = audio()
  if (!c || !master || !noiseBuf) return
  const t = c.currentTime
  const src = c.createBufferSource()
  src.buffer = noiseBuf
  const f = c.createBiquadFilter()
  f.type = 'bandpass'
  f.Q.value = q
  f.frequency.setValueAtTime(fromHz, t)
  f.frequency.exponentialRampToValueAtTime(toHz, t + dur)
  const g = c.createGain()
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.15)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  src.connect(f).connect(g).connect(master)
  src.start(t)
  src.stop(t + dur + 0.02)
}

// ── The palette ──

// Pentatonic steps so any run of ticks sounds like a phrase, not noise.
const SCALE = [0, 2, 4, 7, 9, 12, 14, 16]

/** Selection moved (menu item, nav link hover). `step` pitches it. */
export function tick(step = 0) {
  const semis = SCALE[((step % SCALE.length) + SCALE.length) % SCALE.length]
  const f = 880 * Math.pow(2, semis / 12)
  blip('square', f, f * 0.75, 0.045, 0.16)
}

/** Committed a choice (click / Enter): a rising two-note stab + a click. */
export function confirm() {
  blip('triangle', 660, 650, 0.07, 0.35)
  blip('triangle', 990, 980, 0.11, 0.3, 0.055)
  sweep(4000, 6000, 0.03, 0.25, 0.8)
}

/** Full-screen menu slashes open: a rising noise slash under a low thump. */
export function open() {
  sweep(500, 4200, 0.22, 0.5)
  blip('sine', 140, 60, 0.16, 0.5)
}

/** Menu closes: the slash falls. */
export function close() {
  sweep(3600, 400, 0.18, 0.4)
}

/** Page transition wipe: a longer slash that matches the 600ms veil. */
export function wipe() {
  sweep(300, 5000, 0.5, 0.42, 0.9)
}
