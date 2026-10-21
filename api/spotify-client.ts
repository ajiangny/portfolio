/**
 * /api/spotify-client — the Spotify app's public Client ID for the browser.
 *
 * Premium listeners log in with PKCE (src/components/about/spotifyAuth.ts),
 * which needs the Client ID but never the secret, so only the ID leaves the
 * server. Reusing SPOTIFY_CLIENT_ID means no extra env var. Without it the
 * player keeps to the public embed (previews for logged-out visitors).
 */
import type { ApiRequest, ApiResponse } from './_types'

export default function handler(req: ApiRequest, res: ApiResponse) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method not allowed' })
  }
  res.setHeader('Cache-Control', 's-maxage=3600')
  return res.status(200).json({ clientId: process.env.SPOTIFY_CLIENT_ID || null })
}
