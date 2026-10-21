/**
 * spotifyAuth.ts — Spotify login for Premium listeners (OAuth PKCE, no server)
 *
 * The Web Playback SDK (spotifySdk.ts) streams full songs inside the page and
 * has a volume control, but it needs a logged-in Premium account. Login runs
 * in a popup so the page (and its music) carries on: the popup lands on
 * /spotify-callback.html, which posts the code back, and we trade it for
 * tokens straight from the browser (PKCE needs no client secret). Tokens live
 * in localStorage and refresh themselves.
 *
 * Setup lives in the Spotify developer dashboard (see ARCHITECTURE.md): the
 * redirect URI must be registered, and while the app is in Development Mode
 * only listeners added under User Management can log in.
 */
const TOKEN_KEY = 'spotify-token'
const RESULT_KEY = 'spotify-auth-result'
const TOKEN_URL = 'https://accounts.spotify.com/api/token'
const SCOPES = 'streaming user-read-email user-read-private user-read-playback-state user-modify-playback-state'

interface Token { access: string; refresh: string; expiresAt: number }

const linkListeners = new Set<(linked: boolean) => void>()
/** Subscribe to login/logout (the menu's Settings and the player both follow it). */
export function onLinkChange(fn: (linked: boolean) => void) {
  linkListeners.add(fn)
  return () => { linkListeners.delete(fn) }
}

let clientIdPromise: Promise<string | null> | null = null

/** The app's Client ID from /api/spotify-client, or null if none is set. */
export function getClientId() {
  clientIdPromise ??= fetch('/api/spotify-client')
    .then((r) => (r.ok ? r.json() : null))
    .then((d: { clientId?: string | null } | null) => d?.clientId || null)
    .catch(() => null)
  return clientIdPromise
}

const redirectUri = () => `${location.origin}/spotify-callback.html`

function readToken(): Token | null {
  try { return JSON.parse(localStorage.getItem(TOKEN_KEY) ?? 'null') as Token | null } catch { return null }
}
function saveToken(d: { access_token: string; refresh_token?: string; expires_in: number }, prev?: Token | null) {
  const t: Token = { access: d.access_token, refresh: d.refresh_token ?? prev?.refresh ?? '', expiresAt: Date.now() + d.expires_in * 1000 }
  const wasLinked = isLinked()
  try { localStorage.setItem(TOKEN_KEY, JSON.stringify(t)) } catch { /* ignore */ }
  if (!wasLinked) linkListeners.forEach((fn) => fn(true))
  return t
}

/** Has this browser logged in to Spotify here before? */
export function isLinked() { return !!readToken()?.refresh }

export function unlink() {
  const wasLinked = isLinked()
  try { localStorage.removeItem(TOKEN_KEY) } catch { /* ignore */ }
  if (wasLinked) linkListeners.forEach((fn) => fn(false))
}

/** A valid access token, refreshed when it's about to expire; null if logged out. */
export async function getToken(): Promise<string | null> {
  const t = readToken()
  if (!t) return null
  if (t.expiresAt > Date.now() + 60_000) return t.access
  const clientId = await getClientId()
  if (!clientId || !t.refresh) return null
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'refresh_token', refresh_token: t.refresh, client_id: clientId }),
  }).catch(() => null)
  if (!r?.ok) { if (r && r.status === 400) unlink(); return null } // 400 = refresh token revoked
  return saveToken(await r.json(), t).access
}

const b64url = (bytes: Uint8Array) =>
  btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/**
 * Open the Spotify login popup. Call it straight from a click (popup blockers
 * only allow a window opened inside the gesture). Resolves true once tokens
 * are stored, false if the visitor closed it or Spotify refused.
 */
export function login(): Promise<boolean> {
  // Open first, inside the gesture; the URL needs async work (SHA-256).
  const popup = window.open('about:blank', 'spotify-login', 'width=480,height=720')
  return (async () => {
    const clientId = await getClientId()
    if (!clientId) { popup?.close(); return false }
    const verifier = b64url(crypto.getRandomValues(new Uint8Array(48)))
    const challenge = b64url(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))))
    const state = b64url(crypto.getRandomValues(new Uint8Array(12)))
    const url = 'https://accounts.spotify.com/authorize?' + new URLSearchParams({
      client_id: clientId,
      response_type: 'code',
      redirect_uri: redirectUri(),
      scope: SCOPES,
      code_challenge_method: 'S256',
      code_challenge: challenge,
      state,
    })
    try { localStorage.removeItem(RESULT_KEY) } catch { /* ignore */ }
    if (!popup || popup.closed) return false // blocked
    popup.location.href = url

    const result = await new Promise<{ code: string | null; state: string | null } | null>((resolve) => {
      const done = (v: { code: string | null; state: string | null } | null) => {
        window.removeEventListener('message', onMsg)
        window.removeEventListener('storage', onStorage)
        window.clearInterval(poll)
        resolve(v)
      }
      const onMsg = (e: MessageEvent) => {
        if (e.origin === location.origin && e.data?.type === 'spotify-auth') done(e.data)
      }
      const onStorage = (e: StorageEvent) => {
        if (e.key === RESULT_KEY && e.newValue) { try { done(JSON.parse(e.newValue)) } catch { done(null) } }
      }
      // Closed without finishing (give a just-arrived message a beat to land).
      const poll = window.setInterval(() => { if (popup?.closed) setTimeout(() => done(null), 400) }, 500)
      window.addEventListener('message', onMsg)
      window.addEventListener('storage', onStorage)
    })
    try { localStorage.removeItem(RESULT_KEY) } catch { /* ignore */ }
    if (!result?.code || result.state !== state) return false

    const r = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: result.code,
        redirect_uri: redirectUri(),
        client_id: clientId,
        code_verifier: verifier,
      }),
    }).catch(() => null)
    if (!r?.ok) return false
    saveToken(await r.json())
    return true
  })()
}
