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
 * Sizing: pass a fixed `size` (number) for a constant pixel size (mobile), or
 * omit it to size the dog RESPONSIVELY as a fraction of the measured tile
 * (min(width·widthFactor, height·heightFactor), clamped to [minSize, maxSize]).
 * Responsive size is recomputed on resize and read from a ref each frame, so the
 * dog scales with the tile without restarting the loop. Walk speed + hop height
 * scale with the live size so the motion reads the same at any scale.
 *
 * Reduced motion: renders a single static idle frame, no RAF, no interaction.
 */
import { useRef, useEffect } from 'react'

const SHEETS = {
  idle: { src: '/animation/dog/idle.png', frames: 4, fps: 5 },
  walk: { src: '/animation/dog/walk.png', frames: 6, fps: 10 },
  bark: { src: '/animation/dog/bark.png', frames: 4, fps: 9 },
}

const FLOOR = 10 // gap from the tile's bottom edge
const RIGHT_SAFE = 140 // reserved right strip so the dog never reaches the Resume button

const rand = (lo, hi) => lo + Math.random() * (hi - lo)
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v))

export default function DogPet({
  size, // number → fixed size; undefined → responsive
  jumpScale = 1,
  minSize = 60,
  maxSize = 380,
  widthFactor = 0.36, // dog ≈ 36% of tile width (≈300px at a 1920-wide layout)
  heightFactor = 0.55, // …but never taller than 55% of the tile (guards short screens)
}) {
  const fixed = typeof size === 'number'
  const initialSize = fixed ? size : 120 // pre-measure placeholder; corrected on mount
  const layerRef = useRef(null) // the inset-0 stage; its size = tile interior
  const dogRef = useRef(null) // the moving sprite (a <button>)
  const widthRef = useRef(0)
  const sizeRef = useRef(initialSize) // live render size, read each frame

  useEffect(() => {
    const layer = layerRef.current
    const dog = dogRef.current
    if (!layer || !dog) return

    const reduce =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

    // ── Measure the stage → roam bounds + responsive dog size ─────────────────
    const computeSize = () => {
      if (fixed) return size
      const w = layer.clientWidth
      const h = layer.clientHeight
      return Math.round(clamp(Math.min(w * widthFactor, h * heightFactor), minSize, maxSize))
    }
    const measure = () => {
      widthRef.current = layer.clientWidth
      sizeRef.current = computeSize()
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(layer)

    // ── Static fallback under reduced motion ──────────────────────────────────
    if (reduce) {
      const SIZE = sizeRef.current
      dog.style.width = `${SIZE}px`
      dog.style.height = `${SIZE}px`
      dog.style.backgroundImage = `url(${SHEETS.idle.src})`
      dog.style.backgroundSize = `${SHEETS.idle.frames * SIZE}px ${SIZE}px`
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
    let appliedSize = -1 // last size written to the DOM

    const bounds = () => Math.max(0, widthRef.current - sizeRef.current - RIGHT_SAFE)

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
        st.hopAmp = sizeRef.current * 0.29 * jumpScale
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
      st.hopAmp = sizeRef.current * 0.33 * jumpScale
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

      const SIZE = sizeRef.current
      const maxX = bounds()
      if (st.x === null) st.x = clamp(widthRef.current * 0.22, 0, maxX)

      if (now >= st.until) pickBehaviour(now)

      let hop = 0
      if (st.mode === 'walk') {
        st.x += st.dir * SIZE * 0.55 * dt // walk speed scales with size
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

      // Apply size + sprite frame. backgroundSize/backgroundImage only change on
      // a size change or sheet change; backgroundPosition + transform every frame.
      const sheet = SHEETS[st.sheet]
      let bgSizeDirty = false
      if (SIZE !== appliedSize) {
        dog.style.width = `${SIZE}px`
        dog.style.height = `${SIZE}px`
        appliedSize = SIZE
        bgSizeDirty = true
      }
      if (st.sheet !== currentSheet) {
        dog.style.backgroundImage = `url(${sheet.src})`
        currentSheet = st.sheet
        bgSizeDirty = true
      }
      if (bgSizeDirty) dog.style.backgroundSize = `${sheet.frames * SIZE}px ${SIZE}px`

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
  }, [fixed, size, jumpScale, minSize, maxSize, widthFactor, heightFactor])

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
          width: initialSize,
          height: initialSize,
          backgroundRepeat: 'no-repeat',
          imageRendering: 'pixelated',
          willChange: 'transform',
        }}
      />
    </div>
  )
}
