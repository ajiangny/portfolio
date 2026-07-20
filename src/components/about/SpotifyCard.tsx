/**
 * SpotifyCard.tsx — Queue player bridged to the Spotify iframe API
 *
 * Spotify's Web API won't return playlist tracks to a Development-Mode app, so
 * the ordered tracklist is harvested from the public embed via /api/playlist
 * (title/artist/uri/duration). Per-song cover art comes lazily from /api/track.
 * The hidden iframe is driven as a single-track player: we own the queue and
 * call loadUri() for prev/next + auto-advance, mirroring position/pause state
 * from playback_update. The visible glass card shows the current song.
 */
import {
  useState, useEffect, useRef,
  type CSSProperties,
  type MouseEvent as ReactMouseEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { SPOTIFY } from '../../data/aboutData'
import useMediaQuery from '../../hooks/useMediaQuery'
import useInkFilter from '../../hooks/useInkFilter'

// ── Spotify iframe API shapes (the embed SDK ships no types) ────────────────
interface QueueTrack {
  id?: string
  uri: string
  title?: string
  artist?: string
  duration?: number
}

interface PlaylistMeta {
  name: string | null
  cover: string | null
  url: string
  tracks: QueueTrack[]
}

interface PlaybackData {
  position: number
  duration: number
  isPaused: boolean
}

interface EmbedController {
  loadUri(uri: string): void
  play(): void
  togglePlay(): void
  seek(seconds: number): void
  destroy?(): void
  addListener(event: 'ready', cb: () => void): void
  addListener(event: 'playback_update', cb: (e: { data: PlaybackData }) => void): void
}

interface SpotifyIFrameAPI {
  createController(
    el: HTMLElement,
    opts: { uri: string; width: string; height: string },
    cb: (controller: EmbedController) => void,
  ): void
}

declare global {
  interface Window {
    _spotifyIframeApi?: SpotifyIFrameAPI
    onSpotifyIframeApiReady?: (api: SpotifyIFrameAPI) => void
  }
}

const GREEN = '#1ed760'
const clamp01 = (v: number) => Math.max(0, Math.min(1, v))

function fmt(ms: number) {
  const s = Math.floor((ms || 0) / 1000)
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}

export default function SpotifyCard() {
  const hiddenRef = useRef<HTMLDivElement | null>(null)
  const controllerRef = useRef<EmbedController | null>(null)
  const isMobile = useMediaQuery('(max-width: 767px)')

  const [ready, setReady] = useState(false)
  const [isPaused, setIsPaused] = useState(true)
  const [started, setStarted] = useState(false)
  const [position, setPosition] = useState(0)
  const [duration, setDuration] = useState(0)
  const [tracks, setTracks] = useState<QueueTrack[]>([])
  const [playlistMeta, setPlaylistMeta] = useState<PlaylistMeta | null>(null)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [songCover, setSongCover] = useState<string | null>(null) // last fetched track cover (held across changes)
  const [displayedCover, setDisplayedCover] = useState<string | null>(null) // what's actually rendered (swapped mid-morph)

  // Refs mirror state for the once-registered playback listener / queue control.
  const tracksRef = useRef<QueueTrack[]>([])
  const indexRef = useRef(0)
  const positionRef = useRef(0)
  const endGuardRef = useRef(false)

  // Cover swap uses the shared ink-dissolve filter (hooks/useInkFilter), same
  // treatment as the project cards. coverT rests at 1 (settled/clear); a song
  // change round-trips it 1→0→1 so the art dissolves out and back in.
  const displayedRef = useRef<string | null>(null) // mirrors displayedCover for the transition effect
  const coverT = useMotionValue(1)
  const { defs: coverInkDefs, filter: coverFilter } = useInkFilter(coverT, { maxScale: 60, maxBlur: 8, octaves: 3 })
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')

  // ── Scrub / hover state for the progress bar ─────────────────────────────────
  const [isDragging, setIsDragging] = useState(false)
  const [dragPct, setDragPct] = useState(0)      // 0-1 fraction during drag
  const [hoverPct, setHoverPct] = useState<number | null>(null) // 0-1 fraction while hovering, null otherwise
  const [spotifyHovered, setSpotifyHovered] = useState(false)
  const barRef = useRef<HTMLDivElement | null>(null) // inner track <div> — used by drag handlers for getBoundingClientRect

  // One-time wipe-reveal of the transport buttons once the tile scrolls into view.
  const cardRef = useRef<HTMLDivElement | null>(null)
  const [revealed, setRevealed] = useState(false)
  const [wipeDone, setWipeDone] = useState(false)
  const [playIcon, setPlayIcon] = useState<'rest' | 'toPlay' | 'toPause'>('rest') // debounced
  // Per-animation cache-buster for the play-button SVG. An SVG in <img> runs its
  // SMIL only on the FIRST decode of a given URL, then the browser serves the
  // frozen (fill="freeze") final frame from cache — so a fixed URL replays as the
  // finished state on every later mount, F5 reload, or HMR hot-update. Minting a
  // unique token (timestamp) at each animation start makes every play a fresh,
  // never-decoded URL. Updated alongside the wipe-reveal and the icon morph (in
  // their async timeouts, so it's not a synchronous setState-in-effect).
  const [animToken, setAnimToken] = useState('rest-0')

  // Load a queue index into the embed, optionally autoplaying it.
  const goTo = (rawIdx: number, autoplay = true) => {
    const ts = tracksRef.current
    const c = controllerRef.current
    if (!ts.length || !c) return
    const idx = ((rawIdx % ts.length) + ts.length) % ts.length
    indexRef.current = idx
    setCurrentIndex(idx)
    endGuardRef.current = true // suppress end-detect across the load transition
    c.loadUri(ts[idx].uri)
    if (autoplay) setTimeout(() => { try { controllerRef.current?.play() } catch { /* noop */ } }, 350)
  }

  // ── Init: fetch the tracklist, then create the controller on the first uri ──
  useEffect(() => {
    let cancelled = false
    let ctrl: EmbedController | null = null

    const onUpdate = (d: PlaybackData) => {
      positionRef.current = d.position
      setIsPaused(d.isPaused)
      setPosition(d.position)
      setDuration(d.duration)
      if (!d.isPaused) setStarted(true)

      // The index is owned by goTo()/auto-advance — we deliberately do NOT sync
      // it from playingURI. During a loadUri transition the OUTGOING track keeps
      // emitting updates with its own URI, which would flick the cover/title back
      // to the current track and then forward again once the new one starts.
      if (d.duration > 0 && d.position < d.duration - 2000) endGuardRef.current = false
      if (d.duration > 0 && d.position >= d.duration - 900 && !endGuardRef.current) {
        endGuardRef.current = true
        goTo(indexRef.current + 1)
      }
    }

    const init = async () => {
      let loaded: QueueTrack[] = []
      let meta: PlaylistMeta | null = null
      try {
        const d = await fetch('/api/playlist').then((r) => (r.ok ? r.json() : null)) as PlaylistMeta | null
        if (d && Array.isArray(d.tracks)) { loaded = d.tracks; meta = d }
      } catch { /* dev / offline → static fallback */ }
      if (cancelled) return
      tracksRef.current = loaded
      setTracks(loaded)
      setPlaylistMeta(meta)
      const initialUri = loaded[0]?.uri || SPOTIFY.embedUri

      const make = (IFrameAPI: SpotifyIFrameAPI) => {
        if (cancelled || !hiddenRef.current) return
        IFrameAPI.createController(
          hiddenRef.current,
          { uri: initialUri, width: '1', height: '1' },
          (controller) => {
            if (cancelled) { controller.destroy?.(); return }
            ctrl = controller
            controllerRef.current = controller
            controller.addListener('ready', () => setReady(true))
            controller.addListener('playback_update', (e) => onUpdate(e.data))
          },
        )
      }

      if (window._spotifyIframeApi) {
        make(window._spotifyIframeApi)
      } else {
        window.onSpotifyIframeApiReady = (api: SpotifyIFrameAPI) => { window._spotifyIframeApi = api; make(api) }
        if (!document.querySelector('script[src*="spotify.com/embed/iframe-api"]')) {
          const s = document.createElement('script')
          s.src = 'https://open.spotify.com/embed/iframe-api/v1'
          s.async = true
          document.body.appendChild(s)
        }
      }
    }

    init()
    return () => { cancelled = true; ctrl?.destroy?.(); controllerRef.current = null }
  }, [])

  // ── Lazy per-song cover (single-track lookup) ────────────────────────────────
  useEffect(() => {
    const t = tracks[currentIndex]
    if (!t) return
    let active = true // stale fetches are ignored, so we hold the prior cover until this lands
    fetch(`/api/track?id=${t.id}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (active && d?.cover) setSongCover(d.cover) })
      .catch(() => { })
    return () => { active = false }
  }, [currentIndex, tracks])

  // ── Cover swap as ONE continuous ink-dissolve morph ──────────────────────────
  // Fires whenever the target cover changes — including first play (playlist →
  // song cover) and every song change. Preloads the new art, round-trips coverT
  // 1→0→1 (the shared ink filter reads 0 as peak distortion), swaps the <img> at
  // the trough, so the change reads as a single dissolve rather than "effect,
  // then cut".
  const targetCover = (started && songCover) || playlistMeta?.cover || null
  useEffect(() => {
    if (!targetCover || targetCover === displayedRef.current) return

    // First-ever cover, or reduced motion → swap with no morph.
    if (displayedRef.current === null || reduceMotion) {
      const id = requestAnimationFrame(() => { displayedRef.current = targetCover; setDisplayedCover(targetCover) })
      return () => cancelAnimationFrame(id)
    }

    const pre = new Image() // decode in parallel so the trough swap has no blank frame
    pre.src = targetCover

    let swapped = false
    const controls = animate(coverT, [1, 0, 1], {
      duration: 0.76,
      times: [0, 0.5, 1],
      ease: [0.76, 0, 0.24, 1],
      onUpdate: (v) => {
        if (!swapped && v <= 0.02) {
          swapped = true
          displayedRef.current = targetCover
          setDisplayedCover(targetCover)
        }
      },
    })

    return () => controls.stop()
  }, [targetCover, reduceMotion, coverT])

  // Reveal the transport once the card is meaningfully in view (the tile settled).
  useEffect(() => {
    if (revealed || reduceMotion) return
    const el = cardRef.current
    if (!el) return
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (en.isIntersecting && en.intersectionRatio >= 0.5) { setRevealed(true); io.disconnect(); break }
      }
    }, { threshold: [0.5] })
    io.observe(el)
    return () => io.disconnect()
  }, [revealed, reduceMotion, isMobile])

  // After the dissolve plays, drop the blur/transition styles entirely. The
  // same timeout mints a fresh token so the play-filled self-draw plays from a
  // never-decoded URL (see animToken) once the tile has fully revealed.
  useEffect(() => {
    if (!revealed || reduceMotion) return
    const t = setTimeout(() => {
      setWipeDone(true)
      setAnimToken(`rest-${Math.round(performance.now())}`)
    }, 900)
    return () => clearTimeout(t)
  }, [revealed, reduceMotion])

  // ── Drag seek: track pointer outside the bar and commit on mouseup ───────────
  useEffect(() => {
    if (!isDragging) return
    document.body.style.cursor = 'grabbing'
    const onMove = (e: MouseEvent) => {
      const rect = barRef.current?.getBoundingClientRect()
      if (!rect) return
      setDragPct(clamp01((e.clientX - rect.left) / rect.width))
    }
    const onUp = (e: MouseEvent) => {
      const rect = barRef.current?.getBoundingClientRect()
      if (rect && duration) {
        const pct = clamp01((e.clientX - rect.left) / rect.width)
        setDragPct(pct)
        controllerRef.current?.seek(Math.floor((pct * duration) / 1000))
      }
      setIsDragging(false)
    }
    document.addEventListener('mousemove', onMove)
    document.addEventListener('mouseup', onUp)
    return () => {
      document.body.style.cursor = ''
      document.removeEventListener('mousemove', onMove)
      document.removeEventListener('mouseup', onUp)
    }
  }, [isDragging, duration])

  // Debounce the play-icon morph so rapid clicks settle to ONE clean transition
  // (keying the SMIL on every isPaused flip otherwise thrashes/glitches). A fresh
  // token rides along so the morph SVG replays from a never-decoded URL.
  useEffect(() => {
    if (!started) return
    const id = setTimeout(() => {
      const next = isPaused ? 'toPlay' : 'toPause'
      setPlayIcon(next)
      setAnimToken(`${next}-${Math.round(performance.now())}`)
    }, 90)
    return () => clearTimeout(id)
  }, [isPaused, started])

  const handleTogglePlay = (e: ReactMouseEvent) => { e.stopPropagation(); controllerRef.current?.togglePlay() }
  const handleNext = (e: ReactMouseEvent) => { e.stopPropagation(); goTo(indexRef.current + 1) }
  const handlePrev = (e: ReactMouseEvent) => {
    e.stopPropagation()
    if (positionRef.current > 3000) { controllerRef.current?.seek(0); return }
    goTo(indexRef.current - 1)
  }
  const handleBarMouseDown = (e: ReactMouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    const pct = clamp01((e.clientX - rect.left) / rect.width)
    setDragPct(pct)
    setIsDragging(true)
  }

  const handleBarMouseMove = (e: ReactMouseEvent) => {
    const rect = barRef.current?.getBoundingClientRect()
    if (!rect) return
    setHoverPct(clamp01((e.clientX - rect.left) / rect.width))
  }

  const handleBarMouseLeave = () => setHoverPct(null)

  const isInteractive = ready && duration > 0
  const trackExpanded = hoverPct !== null || isDragging

  const handleBarKeyDown = (e: ReactKeyboardEvent) => {
    if (!isInteractive) return
    const STEP_MS = 5000
    let targetMs: number
    if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') targetMs = Math.max(0, positionRef.current - STEP_MS)
    else if (e.key === 'ArrowRight' || e.key === 'ArrowUp') targetMs = Math.min(duration, positionRef.current + STEP_MS)
    else if (e.key === 'Home') targetMs = 0
    else if (e.key === 'End') targetMs = Math.max(0, duration - 1000)
    else return
    e.preventDefault()
    controllerRef.current?.seek(Math.floor(targetMs / 1000))
  }

  const progressPct = duration > 0 ? (position / duration) * 100 : 0
  const displayPct = isDragging ? dragPct * 100 : progressPct
  const displayTime = isDragging ? dragPct * duration : position
  const hasQueue = tracks.length > 0
  const current = tracks[currentIndex] || null
  const playlistName = playlistMeta?.name || SPOTIFY.track
  const songTitle = current?.title || playlistName
  const songArtist = current?.artist || SPOTIFY.author

  // ── Shared pieces ────────────────────────────────────────────────────────────
  const coverInner = (
    <>
      {coverInkDefs}
      {displayedCover ? (
        <motion.img
          src={displayedCover}
          alt={`${songTitle} cover`}
          className="absolute inset-0 h-full w-full object-cover"
          draggable="false"
          style={{ filter: reduceMotion ? 'none' : coverFilter }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center" style={{ background: 'linear-gradient(140deg, rgba(30,215,96,0.26), rgba(255,255,255,0.06) 60%, rgba(255,255,255,0.03))' }}>
          <svg viewBox="0 0 24 24" className="h-[44%] w-[44%]" fill="none" stroke="rgba(255,255,255,0.78)" strokeWidth="1.6" aria-hidden="true">
            <path d="M9 18V5l12-2v13" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="6" cy="18" r="3" />
            <circle cx="18" cy="16" r="3" />
          </svg>
        </div>
      )}
      {ready && !isPaused && (
        <span className="ab-eq absolute bottom-2 left-2" aria-hidden="true"><span /><span /><span /><span /></span>
      )}
    </>
  )

  const titleBlock = (
    <div className="min-w-0 pr-7">
      <p className="truncate font-sans font-bold text-cream" style={{ fontSize: 'var(--text-title)', letterSpacing: '-0.01em', lineHeight: 1.1 }}>
        {songTitle}
      </p>
      <p className="truncate font-mono text-cream/50" style={{ fontSize: 'var(--text-body)', lineHeight: 1.2 }}>{songArtist}</p>
    </div>
  )

  const progressRow = (
    <div className="flex items-center gap-2.5">
      <span className="shrink-0 font-mono tabular-nums text-cream/45" style={{ fontSize: '10px' }}>
        {ready ? fmt(displayTime) : '0:00'}
      </span>
      <div
        ref={barRef}
        className="flex-1"
        style={{
          position: 'relative',
          paddingTop: '7px',
          paddingBottom: '7px',
          cursor: isDragging ? 'grabbing' : (isInteractive ? 'grab' : 'default'),
          userSelect: 'none',
        }}
        onMouseDown={isInteractive ? handleBarMouseDown : undefined}
        onMouseMove={isInteractive ? handleBarMouseMove : undefined}
        onMouseLeave={handleBarMouseLeave}
        onKeyDown={handleBarKeyDown}
        tabIndex={isInteractive ? 0 : -1}
        role="slider"
        aria-label="Playback position"
        aria-valuenow={Math.round(displayPct)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div style={{
          position: 'relative',
          height: trackExpanded ? '5px' : '4px',
          borderRadius: '4px',
          background: 'rgba(255,255,255,0.16)',
          overflow: 'visible',
          transition: 'height 0.15s ease',
        }}>
          {/* Hover preview fill — shown from 0 → hoverPct while not dragging */}
          {hoverPct !== null && !isDragging && (
            <div style={{
              position: 'absolute',
              insetBlock: 0,
              left: 0,
              width: `${hoverPct * 100}%`,
              background: 'rgba(255,255,255,0.28)',
              borderRadius: '4px',
            }} />
          )}
          {/* Green progress fill */}
          <div style={{
            position: 'absolute',
            insetBlock: 0,
            left: 0,
            width: `${displayPct}%`,
            background: GREEN,
            borderRadius: '4px',
            transition: isDragging ? 'none' : 'width 0.25s ease-out',
          }} />
          {/* Draggable thumb — always visible */}
          <span style={{
            position: 'absolute',
            top: '50%',
            left: `${displayPct}%`,
            width: trackExpanded ? '13px' : '10px',
            height: trackExpanded ? '13px' : '10px',
            marginLeft: trackExpanded ? '-6.5px' : '-5px',
            transform: 'translateY(-50%)',
            borderRadius: '50%',
            background: '#ffffff',
            boxShadow: isDragging
              ? '0 0 0 3px rgba(30,215,96,0.35), 0 1px 4px rgba(8,12,40,0.45)'
              : '0 1px 4px rgba(8,12,40,0.45)',
            transition: isDragging
              ? 'none'
              : 'left 0.25s ease-out, width 0.15s ease, height 0.15s ease, margin-left 0.15s ease, box-shadow 0.15s ease',
            pointerEvents: 'none',
          }} />
        </div>
      </div>
      <span className="shrink-0 font-mono tabular-nums text-cream/45" style={{ fontSize: '10px' }}>
        {ready && duration > 0 ? fmt(duration) : '—:——'}
      </span>
    </div>
  )

  const ghostBtn = 'group/tp flex shrink-0 items-center justify-center rounded-full transition-all duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cream/60 enabled:hover:scale-110 disabled:opacity-30'
  const ghostStyle: CSSProperties = { width: 'clamp(28px, 2.6vw, 34px)', aspectRatio: '1 / 1', background: 'transparent', border: 'none', padding: 0, cursor: ready && hasQueue ? 'pointer' : 'default' }
  const skipImg = 'h-[64%] w-[64%] opacity-70 transition-opacity duration-300 group-hover/tp:opacity-100'

  const prevBtn = (
    <button onClick={handlePrev} disabled={!ready || !hasQueue} className={ghostBtn} style={ghostStyle} aria-label="Previous track">
      <img src="/icons/components/skip-previous.svg" className={skipImg} alt="" aria-hidden="true" draggable="false" />
    </button>
  )

  const nextBtn = (
    <button onClick={handleNext} disabled={!ready || !hasQueue} className={ghostBtn} style={ghostStyle} aria-label="Next track">
      <img src="/icons/components/skip-next.svg" className={skipImg} alt="" aria-hidden="true" draggable="false" />
    </button>
  )

  // Animated play↔pause. Sources come from the debounced `playIcon` so fast
  // clicks settle to one morph. `rest` is the self-drawing play-filled; the
  // transitions morph between shapes (each starts where the last ended). Keyed
  // on playIcon + revealed so the SMIL replays on a settled toggle AND when the
  // tile is revealed (so the play-filled draw is actually seen).
  // The play self-draw should fire AFTER the tile's reveal/wipe finishes, not
  // during it. `wipeDone` flips ~900ms after reveal (once the skip wipes land),
  // so we gate the play button's appearance + self-draw replay on it. Under
  // reduced motion it just shows with no draw delay.
  const playShown = wipeDone || reduceMotion
  const playSrc = playIcon === 'rest'
    ? '/icons/components/play-filled.svg'
    : playIcon === 'toPlay'
      ? '/icons/components/pause-to-play-filled-transition.svg'
      : '/icons/components/play-filled-to-pause-transition.svg'

  const playBtn = (
    <button
      onClick={handleTogglePlay}
      disabled={!ready}
      className="flex shrink-0 items-center justify-center rounded-full transition-transform duration-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1ed760] enabled:hover:scale-110 active:scale-95"
      style={{ width: 'clamp(54px, 5.5vw, 72px)', aspectRatio: '1 / 1', background: 'transparent', border: 'none', padding: 0, cursor: ready ? 'pointer' : 'default', opacity: ready ? 1 : 0.5 }}
      aria-label={isPaused ? 'Play' : 'Pause'}
      data-cursor-label={isPaused ? 'Play' : 'Pause'}
    >
      <img
        key={animToken}
        src={`${playSrc}?v=${animToken}`}
        className="h-full w-full"
        style={{
          transform: 'scale(1.2)',
          opacity: isPaused ? 0.88 : 1,
          filter: isPaused ? 'none' : 'drop-shadow(0 0 7px rgba(30,215,96,0.9))', // green highlight while playing
          transition: reduceMotion ? undefined : 'opacity 0.3s ease, filter 0.3s ease',
        }}
        alt=""
        aria-hidden="true"
        draggable="false"
      />
    </button>
  )

  const headerLabel = (
    <p
      className="shrink-0"
      style={{ fontFamily: "'DM Sans', sans-serif", fontWeight: 700, fontSize: 'var(--text-label)', letterSpacing: '0.22em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.45)' }}
    >
      My Playlist
    </p>
  )

  const wordmark = (
    <a
      href={playlistMeta?.url || SPOTIFY.url}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Open playlist on Spotify"
      data-cursor-label="Spotify"
      className="absolute right-3 top-3 opacity-70 transition-opacity duration-300 hover:opacity-100"
      onClick={(e) => e.stopPropagation()}
      onMouseEnter={() => setSpotifyHovered(true)}
      onMouseLeave={() => setSpotifyHovered(false)}
    >
      <img
        src={spotifyHovered ? '/icons/default/spotify.svg' : '/icons/white/spotify.svg'}
        className="h-4 w-4 md:h-[18px] md:w-[18px]"
        alt="Spotify"
        draggable="false"
      />
    </a>
  )

  // One-time reveal when the tile settles: the skips INK-DISSOLVE in (blur +
  // fade — the ink treatment at icon scale, where turbulence would just read
  // as noise), while the play FADES in (no blur — so its play-filled self-draw
  // stays crisp). The blur is dropped after the reveal so it never fights the
  // hover scale-up.
  const transportShown = revealed || reduceMotion
  const wipeStyle = (i: number): CSSProperties => ({
    display: 'inline-flex',
    opacity: transportShown ? 1 : 0,
    filter: (reduceMotion || wipeDone) ? 'none' : (transportShown ? 'blur(0px)' : 'blur(6px)'),
    transition: reduceMotion ? undefined : 'opacity 0.5s cubic-bezier(0.2, 0, 0, 1), filter 0.5s cubic-bezier(0.2, 0, 0, 1)',
    transitionDelay: (transportShown && !wipeDone && !reduceMotion) ? `${i * 0.1}s` : '0s',
    willChange: (transportShown && !wipeDone) ? 'opacity, filter' : 'auto',
  })
  // The play-filled self-draw IS the entrance, so we keep the opacity fade short
  // and undelayed — otherwise it overlaps the 0.5s stroke-draw + 0.4s fill and
  // the draw is over before the button is even visible. The icon starts empty
  // (stroke-dashoffset 38, fill-opacity 0), so a quick fade never pops.
  const playRevealStyle: CSSProperties = {
    display: 'inline-flex',
    opacity: playShown ? 1 : 0,
    transition: reduceMotion ? undefined : 'opacity 0.2s ease',
  }
  const renderTransport = (className: string) => (
    <div className={className}>
      <span style={wipeStyle(0)}>{prevBtn}</span>
      <span style={playRevealStyle}>{playBtn}</span>
      <span style={wipeStyle(2)}>{nextBtn}</span>
    </div>
  )

  // Cover (square, sized by WIDTH so it can't overflow into the song title) +
  // playlist-title caption beneath. Width-based avoids the flex/aspect-ratio
  // overflow that let a tall cell stretch the square over the text.
  const coverWithCaption = (coverWidth: string, captionSize: string, gap = '6px') => (
    <div className="flex shrink-0 flex-col items-center" style={{ width: coverWidth, gap }}>
      <div className="relative w-full overflow-hidden rounded-2xl" style={{ aspectRatio: '1 / 1', boxShadow: '0 10px 26px rgba(8,12,40,0.42)' }}>
        {coverInner}
      </div>
      <p className="w-full truncate text-center font-mono text-cream/55" style={{ fontSize: captionSize }} title={playlistName}>
        {playlistName}
      </p>
    </div>
  )

  return (
    <>
      {/* Hidden Spotify API mount — createController() replaces the inner node
          with its <iframe>; the 0×0 overflow-hidden wrapper clips it away. */}
      <div aria-hidden="true" style={{ position: 'absolute', width: 0, height: 0, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }}>
        <div ref={hiddenRef} style={{ position: 'absolute', width: '1px', height: '1px' }} />
      </div>

      {isMobile ? (
        /* ── Mobile: header · [cover+caption · title/progress · prev/play/next] ── */
        <div ref={cardRef} className="ab-tile ab-tile-hover group relative flex h-full w-full flex-col gap-1.5 p-3">
          {headerLabel}
          <div className="flex min-h-0 flex-1 items-center gap-2.5">
            {coverWithCaption('clamp(44px, 13vw, 54px)', '8px', '3px')}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-1">
              {titleBlock}
              {progressRow}
            </div>
            {renderTransport('flex shrink-0 items-center gap-0.5')}
          </div>
          {wordmark}
        </div>
      ) : (
        /* ── Desktop: header · [hero cover+caption · stacked player] ── */
        <div ref={cardRef} className="ab-tile ab-tile-hover group relative flex h-full w-full flex-col gap-3 p-4">
          {headerLabel}
          <div className="flex min-h-0 flex-1 items-center gap-5">
            {coverWithCaption('clamp(100px, 12vw, 150px)', 'var(--text-meta)')}
            <div className="flex min-w-0 flex-1 flex-col justify-center gap-2.5">
              {titleBlock}
              {progressRow}
              {renderTransport('flex items-center justify-center gap-5')}
            </div>
          </div>
          {wordmark}
        </div>
      )}
    </>
  )
}
