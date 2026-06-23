/**
 * /api/track?id=<trackId> — one track's cover art (+ name/artist).
 *
 * The embed harvest (/api/playlist) gives title/artist/uri but no cover, and
 * Spotify's BATCH /v1/tracks endpoint is 403 for Development-Mode apps — but
 * the SINGLE /v1/tracks/{id} endpoint still works with a Client Credentials
 * token. The player calls this lazily as each song becomes current, so the
 * cover swaps in when a track plays.
 *
 * Needs SPOTIFY_CLIENT_ID / SPOTIFY_CLIENT_SECRET. Without them this 500s and
 * the card keeps showing the playlist cover (graceful).
 */

const TOKEN_URL = 'https://accounts.spotify.com/api/token'

let cachedToken = null // { value, expiresAt }

async function getToken(clientId, clientSecret) {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 5000) return cachedToken.value
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64')
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Authorization: `Basic ${basic}` },
    body: 'grant_type=client_credentials',
  })
  if (!res.ok) throw new Error(`token request failed (${res.status})`)
  const data = await res.json()
  cachedToken = { value: data.access_token, expiresAt: Date.now() + data.expires_in * 1000 }
  return cachedToken.value
}

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const id = req.query?.id || new URL(req.url, 'http://x').searchParams.get('id')
  if (!id || !/^[A-Za-z0-9]+$/.test(id)) {
    return res.status(400).json({ error: 'missing or invalid id' })
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    return res.status(500).json({ error: 'spotify credentials not configured' })
  }

  try {
    const token = await getToken(clientId, clientSecret)
    const r = await fetch(`https://api.spotify.com/v1/tracks/${id}?market=US`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!r.ok) {
      return res.status(r.status).json({ error: `track request failed (${r.status})` })
    }
    const t = await r.json()
    const payload = {
      id,
      name: t.name ?? null,
      artist: (t.artists ?? []).map((a) => a.name).join(', '),
      cover: t.album?.images?.[0]?.url ?? null,
    }
    res.setHeader('Cache-Control', 's-maxage=86400, stale-while-revalidate=604800')
    return res.status(200).json(payload)
  } catch (err) {
    return res.status(502).json({ error: err.message || 'upstream error' })
  }
}
