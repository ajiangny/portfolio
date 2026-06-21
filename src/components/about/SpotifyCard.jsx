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

function SpotifyMark({ className }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.52 17.34c-.24.36-.66.48-1.02.24-2.82-1.74-6.36-2.1-10.56-1.14-.42.12-.78-.18-.9-.54-.12-.42.18-.78.54-.9 4.56-1.02 8.52-.6 11.64 1.32.42.18.48.66.3 1.02zm1.44-3.3c-.3.42-.84.6-1.26.3-3.24-1.98-8.16-2.58-11.94-1.38-.48.12-1.02-.12-1.14-.6-.12-.48.12-1.02.6-1.14 4.38-1.32 9.78-.66 13.5 1.62.36.18.54.78.24 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.1 9.3c-.6.18-1.2-.18-1.38-.72-.18-.6.18-1.2.72-1.38 4.32-1.32 11.4-1.02 15.9 1.62.54.3.72 1.02.42 1.56-.3.42-1.02.6-1.56.24z" />
    </svg>
  )
}

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
      <SpotifyMark className="pointer-events-none absolute right-3 top-3 h-4 w-4" />
    </a>
  )
}
