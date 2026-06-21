/**
 * DogPet.jsx — interactive pixel-art pet for the tagline tile
 *
 * A little white dog that lives on the floor of the About tagline bento tile.
 * It autonomously cycles through behaviours (idle / walk / bark / a simple hop)
 * on randomised timers, flipping to face the direction it walks. Clicking or
 * tapping it interrupts whatever it's doing with a happy reaction — a bark plus
 * a double hop — then it resumes roaming.
 *
 * Sprites live in /public/animation/dog as horizontal sheets of 48×48 frames
 * (idle 4, walk 6, bark 4), white silhouettes facing right. Frame stepping and
 * movement are driven by ONE requestAnimationFrame loop that reads/writes refs
 * each frame (never effect-closure state) — matching the canvas/RAF pattern used
 * by the gradient. The whole thing self-confines to the left floor so it never
 * overlaps the Resume button at bottom-right.
 *
 * Reduced motion: renders a single static idle frame, no RAF, no interaction.
 */
import { useRef, useEffect } from 'react'

// Native sprite frames are 48×48. The on-screen `size` prop is the render size;
// per-sheet backgroundSize is derived from it so any size stays frame-aligned.
// For the crispest pixels use an integer multiple of 48 (48, 96); 1.5× (72) is
// still fine with image-rendering: pixelated. Walk speed + hop height scale with
// size so the motion reads the same at any scale.
const SHEETS = {
  idle: { src: '/animation/dog/idle.png', frames: 4, fps: 5 },
  walk: { src: '/animation/dog/walk.png', frames: 6, fps: 10 },
  bark: { src: '/animation/dog/bark.png', frames: 4, fps: 9 },
}

const FLOOR = 10 // gap from the tile's bottom edge
const RIGHT_SAFE = 140 // reserved right strip so the dog never reaches the Resume button

const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default function DogPet({ size = 48, jumpScale = 1 }) {
  const SIZE = size
  const WALK_SPEED = size * 0.55 // px / second — proportional to the dog's size
  const layerRef = useRef(null) // the inset-0 stage; its width = tile interior
  const dogRef = useRef(null) // the moving sprite (a <button>)
  const widthRef = useRef(0)

  useEffect(() => {
    const layer = layerRef.current
    const dog = dogRef.current
    if (!layer || !dog) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // ── Measure the stage width (drives roam bounds) ──────────────────────────
    const measure = () => {
      widthRef.current = layer.clientWidth
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(layer)

    // ── Static fallback under reduced motion ──────────────────────────────────
    if (reduce) {
      dog.style.backgroundImage = `url(${SHEETS.idle.src})`
      dog.style.backgroundPosition = '0px 0px'
      dog.style.transform = `translateX(${Math.round(SIZE * 0.5)}px)`
      return () => ro.disconnect()
    }

    // ── Mutable per-frame state (read/written in the RAF loop) ─────────────────
    const st = {
      x: null, // px from left of stage; null until first frame seeds it
      facing: 1, // 1 = right (native), -1 = mirrored
      mode: 'idle', // idle | walk | bark | jump | pet
      sheet: 'idle', // which sprite sheet is showing
      until: 0, // timestamp at which the current behaviour ends
      dir: 1, // walk direction
      target: 0, // walk destination x
      jumpStart: 0,
      jumpDur: 0,
      hopAmp: 0,
    }

    let currentSheet = '' // avoid resetting background-image (and reloading) every frame

    const bounds = () => Math.max(0, widthRef.current - SIZE - RIGHT_SAFE)

    // Pick the next autonomous behaviour with weighted randomness.
    const pickBehaviour = (now) => {
      const maxX = bounds()
      const canWalk = maxX > 12
      const r = Math.random()
      let mode
      if (!canWalk) mode = r < 0.6 ? 'idle' : r < 0.85 ? 'bark' : 'jump'
      else if (r < 0.4) mode = 'idle'
      else if (r < 0.75) mode = 'walk'
      else if (r < 0.9) mode = 'bark'
      else mode = 'jump'

      st.mode = mode
      if (mode === 'idle') {
        st.sheet = 'idle'
        st.until = now + rand(1400, 3200)
      } else if (mode === 'bark') {
        st.sheet = 'bark'
        st.until = now + rand(900, 1600)
      } else if (mode === 'walk') {
        st.sheet = 'walk'
        st.target = rand(0, maxX)
        st.dir = st.target >= st.x ? 1 : -1
        st.facing = st.dir
        st.until = now + 6000 // safety cap; arrival re-picks sooner
      } else {
        // jump — a simple hop, no dedicated sprite (idle frames while airborne)
        st.sheet = 'idle'
        st.jumpStart = now
        st.jumpDur = 520
        st.hopAmp = SIZE * 0.29 * jumpScale
        st.until = now + 600
      }
    }

    // Click / tap / keyboard "pet" — overrides whatever's happening.
    const pet = () => {
      const now = performance.now()
      st.mode = 'pet'
      st.sheet = 'bark'
      st.jumpStart = now
      st.jumpDur = 900
      st.hopAmp = SIZE * 0.33 * jumpScale
      st.until = now + 900
    }
    dog.addEventListener('click', pet)

    // ── The loop ──────────────────────────────────────────────────────────────
    let raf = 0
    let last = performance.now()
    const loop = (now) => {
      raf = requestAnimationFrame(loop)
      const dt = Math.min(0.05, (now - last) / 1000)
      last = now

      const maxX = bounds()
      if (st.x === null) st.x = clamp(widthRef.current * 0.22, 0, maxX)

      if (now >= st.until) pickBehaviour(now)

      let hop = 0
      if (st.mode === 'walk') {
        st.x += st.dir * WALK_SPEED * dt
        if ((st.dir > 0 && st.x >= st.target) || (st.dir < 0 && st.x <= st.target)) {
          st.x = st.target
          st.until = 0 // arrived → re-pick next frame
        }
        st.x = clamp(st.x, 0, maxX)
      } else {
        st.x = clamp(st.x, 0, maxX)
        if (st.mode === 'jump' || st.mode === 'pet') {
          const p = clamp((now - st.jumpStart) / st.jumpDur, 0, 1)
          const bumps = st.mode === 'pet' ? 2 : 1
          hop = st.hopAmp * Math.abs(Math.sin(Math.PI * bumps * p))
          if (p >= 1) st.until = 0
        }
      }

      // Sprite frame
      const sheet = SHEETS[st.sheet]
      if (st.sheet !== currentSheet) {
        dog.style.backgroundImage = `url(${sheet.src})`
        dog.style.backgroundSize = `${sheet.frames * SIZE}px ${SIZE}px`
        currentSheet = st.sheet
      }
      const frame = Math.floor(now / (1000 / sheet.fps)) % sheet.frames
      dog.style.backgroundPosition = `${-frame * SIZE}px 0px`
      dog.style.transform = `translateX(${st.x.toFixed(2)}px) translateY(${(-hop).toFixed(2)}px) scaleX(${st.facing})`
    }
    raf = requestAnimationFrame(loop)

    // Pause the loop while the tab is hidden.
    const onVisibility = () => {
      if (document.hidden) {
        cancelAnimationFrame(raf)
        raf = 0
      } else if (!raf) {
        last = performance.now()
        raf = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      dog.removeEventListener('click', pet)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [SIZE, WALK_SPEED, jumpScale])

  return (
    <div ref={layerRef} className="pointer-events-none absolute inset-0 overflow-hidden" style={{ zIndex: 1 }}>
      <button
        ref={dogRef}
        type="button"
        aria-label="Pet the dog"
        title="Pet me!"
        className="pointer-events-auto absolute left-0 cursor-pointer border-0 bg-transparent p-0"
        style={{
          bottom: FLOOR,
          width: SIZE,
          height: SIZE,
          backgroundRepeat: 'no-repeat',
          backgroundSize: `${SHEETS.idle.frames * SIZE}px ${SIZE}px`,
          imageRendering: 'pixelated',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
