/**
 * /api/playlist — playlist name, cover, and ordered TRACKLIST.
 *
 * Spotify's Web API refuses playlist track data to Development-Mode apps (403,
 * even for the owner's OAuth token), so we harvest the same data Spotify's own
 * public embed renders: the `__NEXT_DATA__` JSON on
 * open.spotify.com/embed/playlist/{id}. No token, no auth.
 *
 * Per-track cover art is NOT in this payload — the player fetches it lazily per
 * song from /api/track. This route returns id/uri/title/artist/duration so the
 * card can drive real prev/next + auto-advance.
 *
 * Note: this reads an undocumented public page shape; if Spotify changes the
 * embed markup it could break, so the response degrades gracefully (empty
 * tracks → the card falls back to its static placeholder).
 */

const DEFAULT_PLAYLIST_ID = '13dthduoXicGhZ7rRTUz4D'

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'method not allowed' })
  }

  const playlistId = process.env.SPOTIFY_PLAYLIST_ID || DEFAULT_PLAYLIST_ID

  try {
    const pageRes = await fetch(`https://open.spotify.com/embed/playlist/${playlistId}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; PortfolioBot/1.0)' },
    })
    if (!pageRes.ok) {
      return res.status(pageRes.status).json({ error: `embed page failed (${pageRes.status})` })
    }
    const html = await pageRes.text()
    const match = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/)
    if (!match) {
      return res.status(502).json({ error: 'embed payload not found' })
    }

    const data = JSON.parse(match[1])
    const entity = data?.props?.pageProps?.state?.data?.entity ?? {}
    const list = Array.isArray(entity.trackList) ? entity.trackList : []

    const tracks = list
      .filter((t) => t?.uri?.startsWith('spotify:track:'))
      .map((t) => ({
        id: t.uri.split(':').pop(),
        uri: t.uri,
        title: t.title ?? '',
        artist: t.subtitle ?? '',
        duration: t.duration ?? 0,
      }))

    const payload = {
      name: entity.name ?? null,
      cover: entity.coverArt?.sources?.[0]?.url ?? null,
      url: `https://open.spotify.com/playlist/${playlistId}`,
      tracks,
    }

    res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400')
    return res.status(200).json(payload)
  } catch (err) {
    return res.status(502).json({ error: err.message || 'harvest error' })
  }
}
