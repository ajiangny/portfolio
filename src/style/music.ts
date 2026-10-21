/**
 * music.ts — the site's background music (public/audio/bgm.mp3)
 *
 * Follows the sound switch in style/sfx: Sound on fades the track in, Sound
 * off fades it out. While the Spotify player is playing the track steps
 * aside (duck), and fades back in when Spotify stops, so the two never play
 * over each other. Every start, stop and loop seam is a gain ramp through
 * Web Audio (an <audio>'s own volume is read-only on iOS), so nothing cuts
 * in or out abruptly. Its loudness is the Music slider in the menu's Settings
 * (setMusicVolume, remembered), separate from the Effects slider (sfx).
 */
import { isSoundOn, onSoundChange } from './sfx'

const SRC = '/audio/bgm.mp3'
const LEVEL = 0.35      // at full volume; the track is mastered loud, sit it under the SFX
const VOLUME_KEY = 'riot-music-volume'
let volume = 0.8
try {
  const v = parseFloat(localStorage.getItem(VOLUME_KEY) ?? '')
  if (v >= 0 && v <= 1) volume = v
} catch { /* storage blocked */ }
const volumeListeners = new Set<(v: number) => void>()
const level = () => LEVEL * volume
const FADE_IN = 1.6     // s
const FADE_OUT = 0.9    // s
const SEAM = 2.5        // s faded out before the end and back in after the loop

let el: HTMLAudioElement | null = null
let ctx: AudioContext | null = null
let gain: GainNode | null = null
let stopTimer: number | undefined
let ducked = false

function setup() {
  if (el) return true
  const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return false
  el = new Audio(SRC)
  el.preload = 'auto'
  ctx = new AC()
  gain = ctx.createGain()
  gain.gain.value = 0
  ctx.createMediaElementSource(el).connect(gain).connect(ctx.destination)

  // Manual loop so the seam can fade: dip before the end, restart, rise.
  el.addEventListener('timeupdate', () => {
    if (!el || !el.duration || el.paused) return
    if (el.duration - el.currentTime < SEAM && !seamOut) {
      seamOut = true
      ramp(0, SEAM * 0.9)
    }
  })
  el.addEventListener('ended', () => {
    if (!el) return
    seamOut = false
    el.currentTime = 0
    if (wanted()) { void el.play().catch(() => {}); ramp(level(), FADE_IN) }
  })
  return true
}
let seamOut = false

function ramp(to: number, secs: number) {
  if (!ctx || !gain) return
  const t = ctx.currentTime
  gain.gain.cancelScheduledValues(t)
  gain.gain.setValueAtTime(gain.gain.value, t)
  gain.gain.linearRampToValueAtTime(to, t + secs)
}

const wanted = () => isSoundOn() && !ducked

/** Bring the music in (or keep it); safe to call repeatedly. */
function fadeIn() {
  if (!setup() || !el || !ctx) return
  window.clearTimeout(stopTimer)
  if (ctx.state === 'suspended') void ctx.resume()
  if (el.paused && seamOut) { el.currentTime = 0; seamOut = false } // stopped mid-seam
  if (el.paused) {
    // play() is refused without a recent gesture; retry on the next one.
    el.play().catch(() => armRetry())
  }
  if (!seamOut) ramp(level(), FADE_IN)
}

/** Fade to silence, then pause so the element stops decoding. */
function fadeOut() {
  if (!el) return
  ramp(0, FADE_OUT)
  window.clearTimeout(stopTimer)
  stopTimer = window.setTimeout(() => el?.pause(), FADE_OUT * 1000 + 50)
}

let retryArmed = false
function armRetry() {
  if (retryArmed) return
  retryArmed = true
  const go = () => {
    window.removeEventListener('click', go, true)
    window.removeEventListener('keydown', go, true)
    retryArmed = false
    // After the click's own handler (it may have just turned sound off).
    setTimeout(() => { if (wanted()) fadeIn() }, 0)
  }
  window.addEventListener('click', go, true)
  window.addEventListener('keydown', go, true)
}

export function getMusicVolume() { return volume }

export function setMusicVolume(v: number) {
  volume = Math.max(0, Math.min(1, v))
  try { localStorage.setItem(VOLUME_KEY, String(volume)) } catch { /* ignore */ }
  // Drags glide to the new level instead of stepping.
  if (wanted() && el && !el.paused && !seamOut) ramp(level(), 0.12)
  volumeListeners.forEach((fn) => fn(volume))
}

export function onMusicVolumeChange(fn: (v: number) => void) {
  volumeListeners.add(fn)
  return () => { volumeListeners.delete(fn) }
}

/** Step aside while another player (Spotify) is playing. */
export function duck(on: boolean) {
  if (ducked === on) return
  ducked = on
  if (wanted()) fadeIn()
  else fadeOut()
}

/** Start following the sound switch; call once at app start. */
export function installMusic() {
  if (isSoundOn()) fadeIn()
  return onSoundChange((on) => { if (on && !ducked) fadeIn(); else fadeOut() })
}
