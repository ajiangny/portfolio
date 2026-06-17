# Fluid Interactive Gradient Background — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the halftone dot system across all five sections with one site-wide, cursor-reactive WebGL mesh gradient that also serves as the page background and carries the existing scroll-driven section transitions.

**Architecture:** A single `position: fixed` full-viewport WebGL canvas (`FluidGradient`) sits behind all content. A domain-warped fBm fragment shader renders the gradient; per-section palettes crossfade by which section holds the viewport center; the cursor locally warps the field; and three section transition `MotionValue`s (seam, flood, pulse) are registered into a `GradientContext` and uploaded as shader uniforms each frame. Sections become background-transparent so the single gradient shows through.

**Tech Stack:** React 19, Vite 8, Tailwind v4, Framer Motion 12 (MotionValues), hand-rolled WebGL1 (no 3D framework). Verification via ESLint + Puppeteer scripts (no unit-test runner in this repo).

---

## Verification model (read first)

This repo has **no unit-test framework** — only `npm run lint` (ESLint), `node scripts/console-check.mjs` (headless load; prints console errors + rendered root size; catches white-screen crashes), and `node scripts/screenshot.mjs <setName>` (captures every section at desktop/tablet/mobile into `scripts/shots/<setName>/`). The dev server must be running for the Puppeteer scripts.

Each task's verification gate uses these tools instead of `pytest`-style assertions. **Before Task 1**, capture a reference set:

```bash
npm run dev   # leave running in another terminal
node scripts/screenshot.mjs baseline
```

`baseline` is the pre-change reference; later sets are diffed against it by eye (the gradient intentionally changes appearance, so diffs are expected — you are checking for *broken* layout/contrast/crashes, not pixel equality).

## File structure

Create:
- `src/components/gradient/gradientConfig.js` — per-section palettes (normalized 0–1 RGB) + tuning constants. One responsibility: data/config.
- `src/components/gradient/shaders.js` — `VERT_SRC` and `FRAG_SRC` GLSL strings. One responsibility: shader source.
- `src/components/gradient/glRenderer.js` — framework-agnostic WebGL1 helper: compile program, fullscreen quad, cached uniform locations, `setUniforms`/`render`/`resize`/`dispose`. One responsibility: GPU plumbing.
- `src/context/GradientContext.jsx` — provider holding a signals ref + `useGradientSignal(key, mv)` registration hook + `useGradientSignals()` accessor. One responsibility: decoupled signal registry.
- `src/components/gradient/FluidGradient.jsx` — the React layer: canvas, RAF loop, cursor, palette controller, reduced-motion/mobile/visibility gating, per-frame uniform upload. One responsibility: lifecycle + orchestration.

Modify:
- `src/App.jsx` — wrap in `GradientProvider`, mount `<FluidGradient />`, drop opaque root background.
- `src/components/Hero.jsx`, `About.jsx`, `Projects.jsx`, `Gallery.jsx`, `Contact.jsx` — remove halftone usage, make backgrounds transparent, register transition signals.
- `src/index.css` — keep `body` cream as the no-WebGL fallback (no change needed there) ; nothing else.
- `CLAUDE.md`, `docs/ARCHITECTURE.md` — document the gradient, delete halftone references.

Delete (final task, after all imports are gone):
- `src/components/halftone/halftoneCore.js`, `HalftoneCanvas.jsx`, `halftoneStrategies.js`
- `src/components/about/ProfileHalftone.jsx`
- `src/components/projects/ProjectsHalftone.jsx`
- `src/components/gallery/GalleryHalftone.jsx`
- `src/components/hero/HalftoneBg.jsx`

## Signal registry contract (used in Tasks 8–11)

Three keys, each a 0→N `MotionValue` registered by the section that already computes it:

| key | registered by | source MotionValue | shader uniform | effect |
|---|---|---|---|---|
| `seam` | About.jsx | `transitionProgress` (0→1, About→Projects native scroll) | `uSeam` | bright luminance band sweeps across at the seam |
| `flood` | Projects.jsx | `projectsWaveFront` (0→1.5) | `uFlood` | radial cobalt bloom center→full screen |
| `pulse` | Gallery.jsx | `pulseProgress` (0→1) | `uPulse` | expanding ring on scroll-in |

A single gradient needs only **one** seam value (the old design used two half-canvases). The dropped Gallery `lineProgress` is **not** registered.

---

## Task 0: Feature branch

**Files:** none (git only)

- [ ] **Step 1: Branch from main**

The spec lives on `docs/fluid-gradient-spec`. Create a clean implementation branch from `main`:

```bash
git checkout main
git checkout -b feat/fluid-gradient
```

- [ ] **Step 2: Capture baseline screenshots**

```bash
npm run dev        # in a separate terminal, leave running
node scripts/screenshot.mjs baseline
```

Expected: `scripts/shots/baseline/` contains desktop/tablet/mobile shots of all five sections, no errors.

- [ ] **Step 3: Commit the baseline marker (optional)**

No code changed yet; nothing to commit. Proceed.

---

## Task 1: Gradient config + tuning constants

**Files:**
- Create: `src/components/gradient/gradientConfig.js`

- [ ] **Step 1: Write the config module**

```js
/**
 * gradientConfig.js — Palettes + tuning for the site-wide fluid gradient.
 *
 * Palettes are ordered to match SECTIONS in src/config/sections.js. Each
 * section gets three stops (dark→mid→light or themed) that the shader mixes
 * across the noise field; the at-rest palette reproduces that section's
 * former solid background so text contrast is preserved when the section
 * goes background-transparent.
 */

// Normalize an 8-bit RGB triple to 0–1 for GLSL.
const rgb = (r, g, b) => [r / 255, g / 255, b / 255]

// stops: [stop0 (low noise), stop1 (mid), stop2 (high noise)]
export const SECTION_PALETTES = {
  hero:     { stops: [rgb(18, 42, 107), rgb(27, 58, 140), rgb(43, 82, 180)] }, // cobalt range (matches old hue-shift band)
  about:    { stops: [rgb(234, 228, 217), rgb(245, 240, 232), rgb(250, 248, 244)] }, // cream
  projects: { stops: [rgb(221, 228, 245), rgb(245, 240, 232), rgb(27, 58, 140)] }, // cream → cobalt
  gallery:  { stops: [rgb(0, 0, 0), rgb(10, 10, 14), rgb(20, 30, 64)] }, // black + faint cobalt
  contact:  { stops: [rgb(0, 0, 0), rgb(8, 8, 10), rgb(40, 40, 46)] }, // black + faint warm
}

// Accent colors reused by the choreography effects.
export const COBALT = rgb(27, 58, 140)
export const CREAM = rgb(245, 240, 232)

export const GRADIENT = {
  FRAME_MS: 30,        // ~30fps, matches the old halftone budget
  FLOW_SPEED: 0.04,    // base time multiplier for the warp field
  CURSOR_RADIUS: 0.28, // warp falloff radius in normalized (aspect-corrected) units
  CURSOR_BUILD: 0.15,  // mouse-strength build-up per active frame (port of halftone feel)
  CURSOR_DECAY: 0.03,  // mouse-strength decay per resting frame
  MOBILE_SCALE: 0.5,   // render-buffer downscale on mobile (upscaled by CSS)
  SEAM_FADE: 0.85,     // section progress at which palette starts crossfading to the next
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems.

- [ ] **Step 3: Commit**

```bash
git add src/components/gradient/gradientConfig.js
git commit -m "feat(gradient): add palette + tuning config"
```

---

## Task 2: Shader source

**Files:**
- Create: `src/components/gradient/shaders.js`

- [ ] **Step 1: Write the shader module**

WebGL1 / GLSL ES 1.00. Six `vec3` palette uniforms (two palettes × three stops) plus a mix factor avoid uniform-array indexing pitfalls.

```js
/**
 * shaders.js — GLSL for the fluid mesh gradient (WebGL1 / GLSL ES 1.00).
 *
 * Domain-warped fBm noise drives a 3-stop palette mix. uPalMix crossfades
 * between the current (A) and next (B) section palettes. uMouse warps the
 * field locally; uSeam / uFlood / uPulse layer the section transitions.
 */
export const VERT_SRC = `
attribute vec2 aPos;
void main() {
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

export const FRAG_SRC = `
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform vec2  uMouse;          // pixels (origin top-left, y already flipped to GL)
uniform float uMouseStrength;  // 0..1
uniform vec3  uPalA0, uPalA1, uPalA2;
uniform vec3  uPalB0, uPalB1, uPalB2;
uniform float uPalMix;         // 0..1 A->B
uniform float uSeam;           // 0..1 sweep (0 or 1 = inactive)
uniform float uFlood;          // 0..~1.5 radial bloom
uniform float uPulse;          // 0..1 ring
uniform float uCursorR;        // cursor warp radius (normalized)

uniform vec3  uCobalt;
uniform vec3  uCream;

// --- value noise + fbm ---------------------------------------------------
float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    v += amp * noise(p);
    p *= 2.0;
    amp *= 0.5;
  }
  return v;
}

vec3 palette(vec3 s0, vec3 s1, vec3 s2, float n) {
  return mix(mix(s0, s1, smoothstep(0.0, 0.5, n)), s2, smoothstep(0.5, 1.0, n));
}

void main() {
  vec2 uv = gl_FragCoord.xy / uResolution.xy;
  float aspect = uResolution.x / uResolution.y;
  vec2 p = vec2(uv.x * aspect, uv.y);

  float t = uTime;

  // domain warp
  vec2 q = vec2(fbm(p + t), fbm(p + vec2(5.2, 1.3) - t));
  vec2 r = vec2(fbm(p + q + vec2(1.7, 9.2) + 0.15 * t),
                fbm(p + q + vec2(8.3, 2.8) - 0.12 * t));

  // cursor warp — bend the field toward the pointer
  vec2 m = uMouse / uResolution.xy;
  m.x *= aspect;
  float md = distance(p, m);
  float infl = uMouseStrength * exp(-(md * md) / (2.0 * uCursorR * uCursorR));
  r += infl * 0.6;

  float f = fbm(p + r);
  float n = clamp(f * 0.6 + 0.4 * r.x + 0.3, 0.0, 1.0);

  vec3 colA = palette(uPalA0, uPalA1, uPalA2, n);
  vec3 colB = palette(uPalB0, uPalB1, uPalB2, n);
  vec3 col = mix(colA, colB, uPalMix);

  // seam — bright band sweeping top->bottom while 0<uSeam<1
  float seamActive = step(0.001, uSeam) * step(uSeam, 0.999);
  float band = smoothstep(0.07, 0.0, abs(uv.y - (1.0 - uSeam)));
  col = mix(col, uCream, band * seamActive * 0.85);

  // flood — radial cobalt bloom from center
  float dc = distance(uv, vec2(0.5));
  float floodR = uFlood * 1.25;
  float flood = smoothstep(floodR, floodR - 0.15, dc) * clamp(uFlood, 0.0, 1.0);
  col = mix(col, uCobalt, flood);

  // pulse — expanding ring on scroll-in
  float pr = uPulse * 1.3;
  float ring = smoothstep(0.08, 0.0, abs(dc - pr)) * (1.0 - uPulse);
  col += uCream * ring * 0.4;

  gl_FragColor = vec4(col, 1.0);
}
`
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems (module is plain string exports).

- [ ] **Step 3: Commit**

```bash
git add src/components/gradient/shaders.js
git commit -m "feat(gradient): add domain-warped mesh gradient shader"
```

---

## Task 3: WebGL renderer

**Files:**
- Create: `src/components/gradient/glRenderer.js`

- [ ] **Step 1: Write the renderer**

```js
/**
 * glRenderer.js — Minimal WebGL1 renderer for one fullscreen-quad shader.
 *
 * Framework-agnostic. createGradientRenderer(canvas) returns null-safe API:
 *   { supported, resize(cssW, cssH, dpr), setUniforms(obj), render(), dispose() }
 * setUniforms accepts a flat map keyed by uniform name; values may be
 * number, [x,y], or [r,g,b]. Unknown/missing uniforms are skipped.
 */
import { VERT_SRC, FRAG_SRC } from './shaders'

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh)
    gl.deleteShader(sh)
    throw new Error('Shader compile failed: ' + log)
  }
  return sh
}

export function createGradientRenderer(canvas) {
  const gl =
    canvas.getContext('webgl', { antialias: false, depth: false, alpha: false }) ||
    canvas.getContext('experimental-webgl')

  if (!gl) return { supported: false, resize() {}, setUniforms() {}, render() {}, dispose() {} }

  let program
  try {
    const vs = compile(gl, gl.VERTEX_SHADER, VERT_SRC)
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG_SRC)
    program = gl.createProgram()
    gl.attachShader(program, vs)
    gl.attachShader(program, fs)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error('Program link failed: ' + gl.getProgramInfoLog(program))
    }
    gl.deleteShader(vs)
    gl.deleteShader(fs)
  } catch (err) {
    console.error('[gradient]', err)
    return { supported: false, resize() {}, setUniforms() {}, render() {}, dispose() {} }
  }

  gl.useProgram(program)

  // Fullscreen quad (two triangles)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
  const aPos = gl.getAttribLocation(program, 'aPos')
  gl.enableVertexAttribArray(aPos)
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

  const locCache = {}
  function loc(name) {
    if (!(name in locCache)) locCache[name] = gl.getUniformLocation(program, name)
    return locCache[name]
  }

  return {
    supported: true,
    resize(cssW, cssH, dpr) {
      canvas.width = Math.max(1, Math.floor(cssW * dpr))
      canvas.height = Math.max(1, Math.floor(cssH * dpr))
      gl.viewport(0, 0, canvas.width, canvas.height)
    },
    setUniforms(obj) {
      for (const name in obj) {
        const l = loc(name)
        if (l === null) continue
        const v = obj[name]
        if (typeof v === 'number') gl.uniform1f(l, v)
        else if (v.length === 2) gl.uniform2f(l, v[0], v[1])
        else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2])
      }
    },
    render() {
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    },
    dispose() {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
      const ext = gl.getExtension('WEBGL_lose_context')
      if (ext) ext.loseContext()
    },
  }
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems.

- [ ] **Step 3: Commit**

```bash
git add src/components/gradient/glRenderer.js
git commit -m "feat(gradient): add WebGL1 fullscreen-quad renderer"
```

---

## Task 4: Gradient signal context

**Files:**
- Create: `src/context/GradientContext.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Write the context**

```jsx
/**
 * GradientContext.jsx — Decoupled registry for the gradient's scroll signals.
 *
 * Sections register the MotionValues that drive transitions (seam/flood/
 * pulse) without the gradient importing section internals. FluidGradient
 * reads signalsRef.current[key].get() each frame; missing keys default to 0.
 */
import { createContext, useContext, useEffect, useRef } from 'react'

const GradientContext = createContext(null)

export function GradientProvider({ children }) {
  const signalsRef = useRef({})
  const register = useRef((key, mv) => {
    signalsRef.current[key] = mv
    return () => {
      if (signalsRef.current[key] === mv) delete signalsRef.current[key]
    }
  }).current

  return (
    <GradientContext.Provider value={{ signalsRef, register }}>
      {children}
    </GradientContext.Provider>
  )
}

export function useGradientSignals() {
  return useContext(GradientContext)
}

/** Register a MotionValue under `key` for the lifetime of the caller. */
export function useGradientSignal(key, motionValue) {
  const ctx = useContext(GradientContext)
  useEffect(() => {
    if (!ctx || !motionValue) return
    return ctx.register(key, motionValue)
  }, [ctx, key, motionValue])
}
```

- [ ] **Step 2: Wrap App in the provider**

In `src/App.jsx`, add the import and wrap the existing tree. Replace:

```jsx
import { TransitionProvider } from './context/TransitionProvider'
```

with:

```jsx
import { TransitionProvider } from './context/TransitionProvider'
import { GradientProvider } from './context/GradientContext'
```

Then wrap `<TransitionProvider>` (inside `MotionConfig`):

```jsx
      <MotionConfig reducedMotion="user">
      <GradientProvider>
      <TransitionProvider>
```

and close it after `</TransitionProvider>`:

```jsx
      </TransitionProvider>
      </GradientProvider>
      </MotionConfig>
```

- [ ] **Step 3: Lint + console-check**

Run: `npm run lint`
Expected: 0 problems.

Run (dev server up): `node scripts/console-check.mjs`
Expected: no console errors; rendered root has non-zero size (app still renders — provider is a no-op so far).

- [ ] **Step 4: Commit**

```bash
git add src/context/GradientContext.jsx src/App.jsx
git commit -m "feat(gradient): add signal registry context and wrap App"
```

---

## Task 5: FluidGradient component + Hero on gradient

This is the vertical slice: a static (no choreography) gradient renders behind everything, the Hero goes background-transparent with its cobalt palette, and the Hero's `HalftoneBg` is removed. Cursor warp and gating come in Tasks 6–7.

**Files:**
- Create: `src/components/gradient/FluidGradient.jsx`
- Modify: `src/App.jsx`, `src/components/Hero.jsx`

- [ ] **Step 1: Write FluidGradient (palette controller + RAF, static field)**

```jsx
/**
 * FluidGradient.jsx — Site-wide fluid mesh-gradient background.
 *
 * One fixed full-viewport WebGL canvas behind all content. Each frame it:
 *   • picks the section holding the viewport center and crossfades that
 *     palette toward the next near the bottom of the section (SEAM_FADE),
 *   • reads registered transition signals (seam/flood/pulse) — Task 8–11,
 *   • reads cursor strength (Task 6),
 *   • uploads uniforms and draws.
 * Throttled to ~30fps; pauses when no section is on screen. Reduced-motion
 * renders a single frame (Task 7). Falls back to the CSS body cream when
 * WebGL is unavailable.
 */
import { useEffect, useRef } from 'react'
import { SECTIONS } from '../../config/sections'
import { createGradientRenderer } from './glRenderer'
import { SECTION_PALETTES, COBALT, CREAM, GRADIENT } from './gradientConfig'
import { useGradientSignals } from '../../context/GradientContext'

export default function FluidGradient() {
  const canvasRef = useRef(null)
  const ctx = useGradientSignals()
  const signalsRef = ctx?.signalsRef ?? { current: {} }

  useEffect(() => {
    const canvas = canvasRef.current
    const renderer = createGradientRenderer(canvas)
    if (!renderer.supported) return // CSS body cream remains visible

    let w = 0, h = 0
    let rafId = null
    let lastDraw = 0
    const start = performance.now()

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      w = window.innerWidth
      h = window.innerHeight
      renderer.resize(w, h, dpr)
    }

    // Which section palette to show + crossfade toward the next.
    function paletteUniforms() {
      const center = h / 2
      let idx = 0
      let through = 0
      for (let i = 0; i < SECTIONS.length; i++) {
        const el = document.getElementById(SECTIONS[i].id)
        if (!el) continue
        const r = el.getBoundingClientRect()
        if (r.top <= center && center < r.bottom) {
          idx = i
          through = r.height > 0 ? (center - r.top) / r.height : 0
          break
        }
        if (center >= r.bottom) idx = i // fallback: last passed section
      }
      const cur = SECTION_PALETTES[SECTIONS[idx].id].stops
      const nextIdx = Math.min(idx + 1, SECTIONS.length - 1)
      const nxt = SECTION_PALETTES[SECTIONS[nextIdx].id].stops
      const mix =
        through > GRADIENT.SEAM_FADE
          ? (through - GRADIENT.SEAM_FADE) / (1 - GRADIENT.SEAM_FADE)
          : 0
      return {
        uPalA0: cur[0], uPalA1: cur[1], uPalA2: cur[2],
        uPalB0: nxt[0], uPalB1: nxt[1], uPalB2: nxt[2],
        uPalMix: mix,
      }
    }

    function sig(key) {
      const mv = signalsRef.current[key]
      return mv ? mv.get() : 0
    }

    function draw(now) {
      rafId = requestAnimationFrame(draw)
      if (now - lastDraw < GRADIENT.FRAME_MS) return
      lastDraw = now

      renderer.setUniforms({
        uResolution: [canvas.width, canvas.height],
        uTime: ((now - start) / 1000) * GRADIENT.FLOW_SPEED,
        uMouse: [-9999, -9999],
        uMouseStrength: 0,
        uCursorR: GRADIENT.CURSOR_RADIUS,
        uCobalt: COBALT,
        uCream: CREAM,
        uSeam: sig('seam'),
        uFlood: sig('flood'),
        uPulse: sig('pulse'),
        ...paletteUniforms(),
      })
      renderer.render()
    }

    resize()
    window.addEventListener('resize', resize)
    rafId = requestAnimationFrame(draw)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      renderer.dispose()
    }
  }, [signalsRef])

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      style={{
        position: 'fixed', inset: 0,
        width: '100%', height: '100%',
        zIndex: -1, pointerEvents: 'none',
      }}
    />
  )
}
```

- [ ] **Step 2: Mount FluidGradient + drop opaque root background**

In `src/App.jsx`, import and mount it as the first child inside the layout div, and remove `bg-cream` from that div so the fixed canvas shows through. Replace:

```jsx
import Contact from './components/Contact'
```

with:

```jsx
import Contact from './components/Contact'
import FluidGradient from './components/gradient/FluidGradient'
```

Replace:

```jsx
        <div className="bg-cream text-ink min-h-screen overflow-x-clip">
          <PageTransition />
```

with:

```jsx
        <div className="text-ink min-h-screen overflow-x-clip">
          <FluidGradient />
          <PageTransition />
```

(`body` keeps `background-color: var(--color-cream)` in index.css as the no-WebGL fallback.)

- [ ] **Step 3: Make the Hero background-transparent and remove HalftoneBg**

In `src/components/Hero.jsx`:

1. Remove the import:

```jsx
import HalftoneBg from './hero/HalftoneBg'
```

2. Remove the halftone block (the `motion.div` wrapping `<HalftoneBg .../>`), i.e. delete:

```jsx
      {/* Animated halftone dot field — fades on scroll */}
      <motion.div style={{ opacity: bgOpacity }} className="absolute inset-0 pointer-events-none">
        <HalftoneBg containerId="hero" colorRgbValue={colorRgbValue} />
      </motion.div>
```

3. Make the Hero section's own background transparent so the gradient shows. Find the Hero root element's background (the cobalt `--color-hero-bg` / `backgroundColor` style or `bg-*` class on the `<section id="hero">` wrapper) and set it to `transparent`. Leave the foreground content, name tag, orbit bubbles, and `colorRgbValue` logic untouched. (If `bgOpacity` becomes unused after removing the block, leave its definition — it is harmless — or delete the single line `const bgOpacity = ...` if ESLint flags it as unused.)

- [ ] **Step 4: Lint + console-check + screenshot**

Run: `npm run lint`
Expected: 0 problems.

Run: `node scripts/console-check.mjs`
Expected: no console errors; non-zero root size. (No "Shader compile failed".)

Run: `node scripts/screenshot.mjs hero-slice`
Expected: `scripts/shots/hero-slice/` shows the Hero with a flowing cobalt gradient behind the wordmark/orbit bubbles, no halftone dots, content legible.

- [ ] **Step 5: Manual check**

In the browser: the Hero shows a slowly flowing cobalt gradient; scrolling down still shows the (unchanged) About section over its own background. No white screen.

- [ ] **Step 6: Commit**

```bash
git add src/components/gradient/FluidGradient.jsx src/App.jsx src/components/Hero.jsx
git commit -m "feat(gradient): render site-wide gradient, put Hero on it"
```

---

## Task 6: Cursor warp

**Files:**
- Modify: `src/components/gradient/FluidGradient.jsx`

- [ ] **Step 1: Add cursor state + listeners + strength build/decay**

Inside the effect in `FluidGradient.jsx`, add mouse tracking above `resize()`:

```jsx
    const mouse = { x: -9999, y: -9999 }
    let mouseStrength = 0
    let lastMove = 0

    const onMove = (e) => {
      // GL origin is bottom-left; flip y so uMouse matches gl_FragCoord
      mouse.x = e.clientX
      mouse.y = h - e.clientY
      lastMove = performance.now()
    }
    const onLeave = () => { mouse.x = -9999; mouse.y = -9999; mouseStrength = 0 }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
```

In `draw`, before `setUniforms`, update strength (port of the halftone 0.15/0.03 feel):

```jsx
      if (now - lastMove > 60) mouseStrength = Math.max(0, mouseStrength - GRADIENT.CURSOR_DECAY)
      else mouseStrength = Math.min(1, mouseStrength + GRADIENT.CURSOR_BUILD)
```

Replace the two static mouse uniforms:

```jsx
        uMouse: [-9999, -9999],
        uMouseStrength: 0,
```

with:

```jsx
        uMouse: [mouse.x, mouse.y],
        uMouseStrength: mouseStrength,
```

Add to the cleanup return:

```jsx
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
```

(Note: `mouse.y` uses `h`, which is updated in `resize()`; this is fine because `onMove` reads `h` at event time.)

- [ ] **Step 2: Lint + console-check**

Run: `npm run lint`
Expected: 0 problems.

Run: `node scripts/console-check.mjs`
Expected: no errors.

- [ ] **Step 3: Manual check**

Move the cursor over the Hero — the gradient field visibly bends toward the pointer and relaxes when the mouse stops. No jank.

- [ ] **Step 4: Commit**

```bash
git add src/components/gradient/FluidGradient.jsx
git commit -m "feat(gradient): cursor warps the field locally"
```

---

## Task 7: Gating — reduced motion, mobile, visibility

**Files:**
- Modify: `src/components/gradient/FluidGradient.jsx`

- [ ] **Step 1: Reduced motion (single static frame)**

Add the hook import at top of `FluidGradient.jsx`:

```jsx
import useMediaQuery from '../../hooks/useMediaQuery'
```

In the component body, before the effect:

```jsx
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 767px)')
```

Add `reduceMotion` and `isMobile` to the effect dep array: `}, [signalsRef, reduceMotion, isMobile])`.

In the effect, when reduced motion is on, render one frame and skip the RAF loop. Replace:

```jsx
    resize()
    window.addEventListener('resize', resize)
    rafId = requestAnimationFrame(draw)
```

with:

```jsx
    resize()
    window.addEventListener('resize', resize)
    if (reduceMotion) {
      draw(performance.now())              // one static frame
      cancelAnimationFrame(rafId)          // draw() scheduled one; cancel it
      rafId = null
    } else {
      rafId = requestAnimationFrame(draw)
    }
```

(Because `draw` calls `requestAnimationFrame` at its top, capture and cancel that id: assign `rafId` inside `draw` already does this — the explicit cancel above stops the loop after the single frame.)

- [ ] **Step 2: Mobile half-resolution**

In `resize()`, scale the buffer down on mobile (CSS still stretches the canvas to 100%). Replace:

```jsx
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
```

with:

```jsx
      const base = Math.min(window.devicePixelRatio || 1, 2)
      const dpr = isMobile ? base * GRADIENT.MOBILE_SCALE : base
```

Also disable cursor warp on mobile — in `draw`, guard the strength update:

```jsx
      if (isMobile) mouseStrength = 0
      else if (now - lastMove > 60) mouseStrength = Math.max(0, mouseStrength - GRADIENT.CURSOR_DECAY)
      else mouseStrength = Math.min(1, mouseStrength + GRADIENT.CURSOR_BUILD)
```

- [ ] **Step 3: Visibility pause (no section on screen / tab hidden)**

The canvas is `position: fixed`, so an IntersectionObserver on it never reports "offscreen". Instead, pause when the document is hidden. Add after the listeners:

```jsx
    const onVisibility = () => {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      } else if (!rafId && !reduceMotion) {
        rafId = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)
```

And in cleanup:

```jsx
      document.removeEventListener('visibilitychange', onVisibility)
```

- [ ] **Step 4: Lint + console-check + screenshots**

Run: `npm run lint`
Expected: 0 problems.

Run: `node scripts/console-check.mjs`
Expected: no errors.

Run: `node scripts/screenshot.mjs gating`
Expected: mobile shots render the gradient (coarser is fine); desktop unchanged.

- [ ] **Step 5: Manual checks**

- OS reduced-motion ON → gradient is a single still frame (no flow, no cursor warp).
- DevTools device toolbar (≤767px) → gradient renders, cursor warp disabled.
- Switch browser tabs and back → no console errors; animation resumes.

- [ ] **Step 6: Commit**

```bash
git add src/components/gradient/FluidGradient.jsx
git commit -m "feat(gradient): reduced-motion, mobile half-res, visibility gating"
```

---

## Task 8: About on gradient + seam signal

**Files:**
- Modify: `src/components/About.jsx`

- [ ] **Step 1: Remove halftone usage**

In `src/components/About.jsx`:

1. Remove imports:

```jsx
import ProfileHalftone from './about/ProfileHalftone'
import ProjectsHalftone from './projects/ProjectsHalftone'
```

2. Delete the three halftone render blocks:
   - the `ProjectsHalftone` dots layer (`halftoneDotsOpacity` motion.div wrapping `<ProjectsHalftone .../>`),
   - the global `<ProfileHalftone ... containerId="about" />` background block,
   - the profile-photo `<ProfileHalftone waveFront={profileWaveFront} .../>` overlay.

3. Remove now-unused MotionValue definitions tied only to those blocks: `halftoneDotsOpacity`, `globalWaveFront`, `profileWaveFront`, `lineWaveFront` (the value passed to ProjectsHalftone). Keep `transitionProgress` — it becomes the seam signal. Remove any that ESLint then flags as unused.

- [ ] **Step 2: Make About background-transparent**

Find the About section background (cream fill on the sticky `100vh` child or the section wrapper) and set it to `transparent` so the gradient shows. The About palette (cream) reproduces the former look. Keep the content mask/fade animations.

- [ ] **Step 3: Register the seam signal**

Add the import:

```jsx
import { useGradientSignal } from '../context/GradientContext'
```

The seam should be 0 at rest, ramp 0→1 across the About→Projects native scroll, then back to 0. `transitionProgress` already runs 0→1 across that seam. In the component body (after `transitionProgress` is defined):

```jsx
  // Drive the gradient's seam band across the About→Projects handoff.
  useGradientSignal('seam', transitionProgress)
```

- [ ] **Step 4: Lint + console-check + screenshot**

Run: `npm run lint`
Expected: 0 problems (resolve any unused-var fallout from Step 1).

Run: `node scripts/console-check.mjs`
Expected: no errors.

Run: `node scripts/screenshot.mjs about`
Expected: About shows the cream gradient behind content; text legible (ink on light); no dots.

- [ ] **Step 5: Manual check**

Scroll from About into Projects: a bright band sweeps across the gradient at the seam (replacing the old line of dots). Content remains readable throughout.

- [ ] **Step 6: Commit**

```bash
git add src/components/About.jsx
git commit -m "feat(gradient): About on gradient, seam band via signal"
```

---

## Task 9: Projects on gradient + flood signal

**Files:**
- Modify: `src/components/Projects.jsx`

- [ ] **Step 1: Remove halftone usage**

In `src/components/Projects.jsx`:

1. Remove import:

```jsx
import ProjectsHalftone from './projects/ProjectsHalftone'
```

2. Delete the `<ProjectsHalftone ... />` render line.
3. Remove MotionValues used only by it: `lineWaveFront` and its `transitionProgress`-derived source if unused elsewhere. **Keep `projectsWaveFront`** — it becomes the flood signal.

- [ ] **Step 2: Make Projects background-transparent**

Set the Projects section/sticky-child background to `transparent`. The Projects palette (cream→cobalt) reproduces the resting cream and supplies the cobalt for the flood. Keep the card animations and the grayscale-to-black card fade (that styling is on the cards, not the halftone).

- [ ] **Step 3: Register the flood signal**

Add import:

```jsx
import { useGradientSignal } from '../context/GradientContext'
```

After `projectsWaveFront` is defined:

```jsx
  // Drive the gradient's radial cobalt bloom as the cards exit.
  useGradientSignal('flood', projectsWaveFront)
```

- [ ] **Step 4: Lint + console-check + screenshot**

Run: `npm run lint`
Expected: 0 problems.

Run: `node scripts/console-check.mjs`
Expected: no errors.

Run: `node scripts/screenshot.mjs projects`
Expected: Projects shows cream gradient; cards legible; no dots.

- [ ] **Step 5: Manual check**

Scroll through Projects to its exit: a cobalt bloom expands from center to full screen as the cards turn/leave, handing off into Gallery. Carousel still works.

- [ ] **Step 6: Commit**

```bash
git add src/components/Projects.jsx
git commit -m "feat(gradient): Projects on gradient, radial flood via signal"
```

---

## Task 10: Gallery on gradient + pulse signal (drop progress line)

**Files:**
- Modify: `src/components/Gallery.jsx`

- [ ] **Step 1: Remove halftone usage + drop lineProgress**

In `src/components/Gallery.jsx`:

1. Remove import:

```jsx
import GalleryHalftone from './gallery/GalleryHalftone'
```

2. Delete the `<GalleryHalftone ... />` render line.
3. **Delete the `lineProgress` MotionValue and any wiring** (`const lineProgress = useTransform(progress, [0, 1], [0.02, 0.94])`). The scroll-progress line is intentionally dropped.
4. Keep `pulseProgress` — it becomes the pulse signal.

- [ ] **Step 2: Make Gallery background-transparent**

The Gallery sits in a `position: fixed` header layer with a black background. Set that layer's `backgroundColor` to `transparent` so the gradient (gallery palette = black) shows. Verify the grid cells (`gallery-cell-*`, defined in index.css with their own rgba backgrounds) still read correctly over the dark gradient.

- [ ] **Step 3: Register the pulse signal**

Add import:

```jsx
import { useGradientSignal } from '../context/GradientContext'
```

After `pulseProgress` is defined:

```jsx
  // Drive the gradient's scroll-in pulse ring.
  useGradientSignal('pulse', pulseProgress)
```

- [ ] **Step 4: Lint + console-check + screenshot**

Run: `npm run lint`
Expected: 0 problems (resolve unused `lineProgress`/related fallout).

Run: `node scripts/console-check.mjs`
Expected: no errors.

Run: `node scripts/screenshot.mjs gallery`
Expected: Gallery shows dark gradient behind the mosaic; cells + cream text legible; no dots; no progress line.

- [ ] **Step 5: Manual check**

Scroll into Gallery: a ring expands once on entry. There is no scroll-progress line. Lightbox still opens/navigates.

- [ ] **Step 6: Commit**

```bash
git add src/components/Gallery.jsx
git commit -m "feat(gradient): Gallery on gradient, pulse ring; drop progress line"
```

---

## Task 11: Contact on gradient

**Files:**
- Modify: `src/components/Contact.jsx`

- [ ] **Step 1: Remove halftone usage**

In `src/components/Contact.jsx`:

1. Remove import:

```jsx
import GalleryHalftone from './gallery/GalleryHalftone'
```

2. Delete the fixed `<GalleryHalftone .../>` layer block (the `motion.div` with `opacity: halftoneOpacity` wrapping it). Remove `halftoneProgress`/`halftoneOpacity` if they become unused.

- [ ] **Step 2: Make Contact background-transparent**

The Contact `<section>` uses inline `style={{ backgroundColor: '#000' }}`. Change to `backgroundColor: 'transparent'`. The contact palette (black) continues the dark field seamlessly from Gallery — the single fixed gradient is naturally continuous, so the old shared-grid trick is no longer needed.

- [ ] **Step 3: Lint + console-check + screenshot**

Run: `npm run lint`
Expected: 0 problems.

Run: `node scripts/console-check.mjs`
Expected: no errors.

Run: `node scripts/screenshot.mjs contact`
Expected: Contact shows dark gradient continuous with Gallery; form fields + cream text legible.

- [ ] **Step 4: Manual check**

Gallery → Contact transition: the dark gradient flows continuously across the boundary (no seam, no grid break). Form submit (`mailto:`) and footer nav still work.

- [ ] **Step 5: Commit**

```bash
git add src/components/Contact.jsx
git commit -m "feat(gradient): Contact on gradient, continuous dark field"
```

---

## Task 12: Delete halftone modules

**Files:**
- Delete: `src/components/halftone/halftoneCore.js`, `src/components/halftone/HalftoneCanvas.jsx`, `src/components/halftone/halftoneStrategies.js`, `src/components/about/ProfileHalftone.jsx`, `src/components/projects/ProjectsHalftone.jsx`, `src/components/gallery/GalleryHalftone.jsx`, `src/components/hero/HalftoneBg.jsx`

- [ ] **Step 1: Confirm no remaining imports**

Run: `node -e "process.exit(0)"` is not enough — grep instead. Search the `src` tree for any remaining halftone references:

Use the editor's search (or ripgrep): `Halftone` and `halftone` across `src/`. Expected matches: **none** in `src/` except the files about to be deleted.

- [ ] **Step 2: Delete the files**

```bash
git rm src/components/halftone/halftoneCore.js \
       src/components/halftone/HalftoneCanvas.jsx \
       src/components/halftone/halftoneStrategies.js \
       src/components/about/ProfileHalftone.jsx \
       src/components/projects/ProjectsHalftone.jsx \
       src/components/gallery/GalleryHalftone.jsx \
       src/components/hero/HalftoneBg.jsx
```

- [ ] **Step 3: Restart the dev server (Vite stale-module gotcha)**

Stop and restart `npm run dev`. (Per CLAUDE.md: after deleting modules Vite's stale module graph can 404 / white-screen while HMR claims success.)

- [ ] **Step 4: Lint + console-check + full screenshot set**

Run: `npm run lint`
Expected: 0 problems.

Run: `node scripts/console-check.mjs`
Expected: no console errors; non-zero root size.

Run: `node scripts/screenshot.mjs gradient-final`
Expected: all five sections render on the gradient, legible, no dots, no white screens.

- [ ] **Step 5: Build sanity**

Run: `npm run build`
Expected: build succeeds (no missing-module errors from the deletions).

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove halftone engine, presets, and Hero HalftoneBg"
```

---

## Task 13: Documentation

**Files:**
- Modify: `CLAUDE.md`, `docs/ARCHITECTURE.md`, `docs/superpowers/specs/2026-06-14-fluid-gradient-background-design.md`

- [ ] **Step 1: Update CLAUDE.md**

- In "Core patterns", replace the **Halftone canvases** bullet with a **Fluid gradient** bullet describing: one fixed `FluidGradient` WebGL canvas behind all content; `glRenderer.js` + `shaders.js` + `gradientConfig.js`; sections are background-transparent; transitions registered via `GradientContext` (`useGradientSignal`).
- In "Single sources of truth", add a row: gradient palettes/constants → `src/components/gradient/gradientConfig.js`.
- In the z-index registry gotcha, note `FluidGradient` canvas is `z-index: -1` (behind all content).

- [ ] **Step 2: Update docs/ARCHITECTURE.md**

- Replace section **"3. Halftone engine"** with **"3. Fluid gradient background"**: the single-canvas architecture, shader uniforms table, palette crossfade rule (SEAM_FADE), the seam/flood/pulse signal mapping, and the gating (reduced-motion/mobile/visibility/WebGL-fallback).
- In each section's scroll-choreography table, replace halftone wave/pulse/line rows with the corresponding gradient uniform (seam/flood/pulse), and remove the dropped Gallery progress-line row.

- [ ] **Step 3: Add the spec refinement note**

In the design spec, under §3 (Architecture), append: "Consequence: sections become background-transparent (root `bg-cream`, Gallery/Contact `#000`, Hero cobalt removed); the gradient is the page background, and each section's at-rest palette reproduces its former background color for text contrast. `body` keeps cream as the no-WebGL fallback."

- [ ] **Step 4: Verify docs match reality**

Re-read the three edited docs; confirm no lingering "halftone" references describe current behavior.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md docs/ARCHITECTURE.md docs/superpowers/specs/2026-06-14-fluid-gradient-background-design.md
git commit -m "docs: document fluid gradient, retire halftone references"
```

---

## Task 14: Final verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full gate**

```bash
npm run lint        # 0 problems
npm run build       # succeeds
node scripts/console-check.mjs   # no errors, non-zero root
node scripts/screenshot.mjs final
```

- [ ] **Step 2: Manual regression checklist**

- [ ] Hero: flowing cobalt gradient, cursor warp, content legible.
- [ ] About: cream gradient, ink text legible, seam band sweeps into Projects.
- [ ] Projects: cream gradient, cards legible, cobalt flood on exit, carousel works.
- [ ] Gallery: dark gradient, mosaic + cream text legible, pulse ring on entry, no progress line, lightbox works.
- [ ] Contact: dark gradient continuous from Gallery, form + footer nav work.
- [ ] Nav blob transitions (`goToSection`) still land correctly on every section.
- [ ] Reduced-motion: single static frame everywhere.
- [ ] Mobile (≤767px): gradient renders (coarser), no cursor warp, layouts intact.
- [ ] Tab away/return: no errors, animation resumes.

- [ ] **Step 3: Finish the branch**

Use superpowers:finishing-a-development-branch to decide merge/PR/cleanup.

---

## Self-review notes

- **Spec coverage:** all-five-sections scope (Tasks 5,8,9,10,11) ✓; WebGL mesh gradient (Tasks 2,3) ✓; cursor warp (Task 6) ✓; seam/flood/pulse choreography re-homed onto existing MotionValues (Tasks 8,9,10) ✓; Gallery progress line dropped (Task 10) ✓; reduced-motion/mobile/visibility/WebGL fallback (Tasks 3,7) ✓; single-canvas continuity (Task 5) ✓; deletion + docs (Tasks 12,13) ✓; per-section palettes from tokens (Task 1) ✓.
- **Added beyond spec (flagged):** sections becoming background-transparent — a necessary consequence of the single fixed canvas; recorded in Task 13 Step 3 spec refinement.
- **Type consistency:** uniform names match between `shaders.js`, `glRenderer.setUniforms` calls, and `FluidGradient` (`uResolution,uTime,uMouse,uMouseStrength,uCursorR,uCobalt,uCream,uPalA0..2,uPalB0..2,uPalMix,uSeam,uFlood,uPulse`); signal keys match between `useGradientSignal('seam'|'flood'|'pulse', …)` and `sig('seam'|'flood'|'pulse')`.
```
