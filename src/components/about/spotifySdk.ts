/**
 * spotifySdk.ts — the Spotify Web Playback SDK behind the embed's interface
 *
 * For a logged-in Premium listener (spotifyAuth.ts) the page itself becomes a
 * Spotify Connect device: full songs, and a real volume control, so the menu's
 * Music slider covers Spotify too. createSdkController() returns the same
 * shape SpotifyCard already drives the hidden embed with (loadUri / play /
 * togglePlay / seek / listeners), plus setVolume, so the card's queue,
 * progress bar and prompt work unchanged on either backend.
 *
 * Errors that mean "this account can't use the SDK" (not Premium, not on the
 * app's allowlist, login revoked) are reported as 'error' so the card can
 * fall back to the embed.
 */
import { getToken } from './spotifyAuth'

interface SdkState { paused: boolean; position: number; duration: number }
interface SdkPlayer {
  connect(): Promise<boolean>
  disconnect(): void
  addListener(ev: string, cb: (e: never) => void): void
  getCurrentState(): Promise<SdkState | null>
  setVolume(v: number): Promise<void>
  resume(): Promise<void>
  pause(): Promise<void>
  togglePlay(): Promise<void>
  seek(ms: number): Promise<void>
  activateElement?(): Promise<void>
}
declare global {
  interface Window {
    Spotify?: { Player: new (o: { name: string; getOAuthToken: (cb: (t: string) => void) => void; volume: number }) => SdkPlayer }
    onSpotifyWebPlaybackSDKReady?: () => void
  }
}

export interface PlaybackData { position: number; duration: number; isPaused: boolean }
export type SdkError = 'account' | 'auth' | 'init' | 'playback'

export interface SdkController {
  loadUri(uri: string): void
  play(): void
  togglePlay(): void
  seek(seconds: number): void
  setVolume(v: number): void
  destroy(): void
  addListener(event: 'ready', cb: () => void): void
  addListener(event: 'playback_update', cb: (e: { data: PlaybackData }) => void): void
  addListener(event: 'error', cb: (kind: SdkError) => void): void
}

let sdkReady: Promise<void> | null = null
function loadSdk() {
  sdkReady ??= new Promise<void>((resolve) => {
    if (window.Spotify) { resolve(); return }
    window.onSpotifyWebPlaybackSDKReady = () => resolve()
    const s = document.createElement('script')
    s.src = 'https://sdk.scdn.co/spotify-player.js'
    s.async = true
    document.body.appendChild(s)
  })
  return sdkReady
}

export function createSdkController(volume: number): SdkController {
  const on = { ready: [] as (() => void)[], update: [] as ((e: { data: PlaybackData }) => void)[], error: [] as ((k: SdkError) => void)[] }
  let player: SdkPlayer | null = null
  let deviceId: string | null = null
  let uri: string | null = null
  let loaded = false // has `uri` been sent to this device yet?
  let destroyed = false
  let poll: number | undefined
  let failed = false

  const fail = (kind: SdkError) => {
    if (failed || destroyed) return
    failed = true
    on.error.forEach((cb) => cb(kind))
  }
  const emit = (s: SdkState | null) => {
    if (!s) return
    on.update.forEach((cb) => cb({ data: { position: s.position, duration: s.duration, isPaused: s.paused } }))
  }

  // Start `uri` on this device via the Web API (the SDK can't choose a track).
  const start = async (retry = true) => {
    const token = await getToken()
    if (!token || !deviceId || !uri) { if (!token) fail('auth'); return }
    const r = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${encodeURIComponent(deviceId)}`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ uris: [uri] }),
    }).catch(() => null)
    if (r?.ok) { loaded = true; return }
    // A device that just connected can take a moment to be playable.
    if (r?.status === 404 && retry) { setTimeout(() => void start(false), 1000); return }
    fail(r?.status === 401 || r?.status === 403 ? 'auth' : 'playback')
  }

  void loadSdk().then(async () => {
    if (destroyed || !window.Spotify) return
    player = new window.Spotify.Player({
      name: 'Andrew Jiang · Portfolio',
      getOAuthToken: (cb) => { void getToken().then((t) => { if (t) cb(t); else fail('auth') }) },
      volume,
    })
    player.addListener('ready', ((e: { device_id: string }) => {
      deviceId = e.device_id
      on.ready.forEach((cb) => cb())
    }) as (e: never) => void)
    player.addListener('player_state_changed', ((s: SdkState | null) => emit(s)) as (e: never) => void)
    player.addListener('account_error', (() => fail('account')) as (e: never) => void)
    player.addListener('authentication_error', (() => fail('auth')) as (e: never) => void)
    player.addListener('initialization_error', (() => fail('init')) as (e: never) => void)
    player.addListener('playback_error', (() => fail('playback')) as (e: never) => void)
    if (!(await player.connect())) fail('init')
    // player_state_changed only fires on changes, so tick the position while playing.
    poll = window.setInterval(() => { void player?.getCurrentState().then((s) => { if (s && !s.paused) emit(s) }) }, 500)
  })

  return {
    loadUri(u) { uri = u; loaded = false },
    play() {
      void player?.activateElement?.() // inside the click: lets Safari/iOS start audio
      if (!loaded) void start(); else void player?.resume()
    },
    togglePlay() {
      void player?.activateElement?.()
      if (!loaded) void start(); else void player?.togglePlay()
    },
    seek(seconds) { void player?.seek(seconds * 1000) },
    setVolume(v) { void player?.setVolume(Math.max(0, Math.min(1, v))) },
    destroy() {
      destroyed = true
      window.clearInterval(poll)
      player?.disconnect()
    },
    addListener(event: string, cb: never) {
      if (event === 'ready') on.ready.push(cb)
      else if (event === 'playback_update') on.update.push(cb)
      else if (event === 'error') on.error.push(cb)
    },
  } as SdkController
}
