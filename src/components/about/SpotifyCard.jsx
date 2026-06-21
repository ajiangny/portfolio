/**
 * SpotifyCard.jsx — Custom Spotify Faux-Player (About bento)
 *
 * A bespoke "now playing" card styled after Spotify's mini-player: album
 * cover, track/author, an animated scrubber, a play button, and the Spotify
 * wordmark. The whole card is a link that opens the configured playlist in a
 * new tab. The scrubber/equalizer are decorative (CSS keyframes that freeze
 * under prefers-reduced-motion); the play button does not actually play audio.
 *
 * Content comes from SPOTIFY in aboutData.js (placeholder until filled in).
 */
import { SPOTIFY } from '../../data/aboutData'

const GREEN = '#1ed760'


export default function SpotifyCard() {
  const hasCover = Boolean(SPOTIFY.cover)

  return (
    <a
      href={SPOTIFY.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${SPOTIFY.track} by ${SPOTIFY.author} on Spotify`}
      className="ab-tile ab-tile-hover group flex h-full w-full items-center gap-3 px-3 py-3 md:gap-4 md:px-4"
      style={{ textDecoration: 'none' }}
    >
      {/* Album cover (disc placeholder when no cover supplied) */}
      <div
        className="relative shrink-0 overflow-hidden rounded-xl"
        style={{ width: 'clamp(46px, 5vw, 64px)', aspectRatio: '1 / 1' }}
      >
        {hasCover ? (
          <img src={SPOTIFY.cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div
            className="absolute inset-0 flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, rgba(245,240,232,0.22), rgba(245,240,232,0.06))' }}
          >
            <svg viewBox="0 0 24 24" className="h-1/2 w-1/2" fill="none" stroke="rgba(245,240,232,0.6)" strokeWidth="1.6" aria-hidden="true">
              <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
              <circle cx="6" cy="18" r="3" />
              <circle cx="18" cy="16" r="3" />
            </svg>
          </div>
        )}
      </div>

      {/* Track meta + scrubber */}
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-1.5">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <p
              className="truncate font-sans font-bold text-cream"
              style={{ fontSize: 'var(--text-label)', letterSpacing: '0.02em' }}
            >
              {SPOTIFY.track}
            </p>
            <p className="truncate font-mono text-cream/55" style={{ fontSize: 'var(--text-meta)' }}>
              {SPOTIFY.author}
            </p>
          </div>
          <span className="ab-eq shrink-0" aria-hidden="true">
            <span /><span /><span /><span />
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-mono text-cream/40" style={{ fontSize: '9px' }}>0:09</span>
          <div className="ab-spotify-bar flex-1">
            <div className="ab-spotify-fill" />
          </div>
          <span className="font-mono text-cream/40" style={{ fontSize: '9px' }}>3:24</span>
        </div>
      </div>

      {/* Play button (decorative — links out) */}
      <div
        className="relative flex shrink-0 items-center justify-center rounded-full transition-transform duration-300 group-hover:scale-110"
        style={{ width: 'clamp(34px, 3.4vw, 42px)', aspectRatio: '1 / 1', background: GREEN }}
        aria-hidden="true"
      >
        <svg viewBox="0 0 24 24" className="ml-0.5 h-1/2 w-1/2" fill="#0a1f12">
          <path d="M8 5v14l11-7z" />
        </svg>
      </div>

      {/* Spotify mark, top-right */}
      <img src="/icons/default/spotify.svg" className="pointer-events-none absolute right-3 top-3 h-4 w-4 md:h-5 md:w-5" alt="" aria-hidden="true" draggable="false" />
    </a>
  )
}
