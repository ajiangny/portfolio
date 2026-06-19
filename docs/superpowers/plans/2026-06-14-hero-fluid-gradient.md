# Hero Readability + Fluid Liquid Gradient — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Hero legible (cream elements on the cobalt field), and turn the background into a real liquid gradient — a low-res GPU fluid sim that pushes/wakes under the pointer, previews each nav section's palette + flow direction on hover, and responds to touch on mobile.

**Architecture:** A small Stam "Stable Fluids" velocity sim runs at ¼ resolution into float/half-float ping-pong textures. The existing full-res domain-warp display shader samples that velocity field to *displace* the palette gradient (the liquid) and derives a wake highlight from velocity magnitude. Hover signals (`heroHover`, `heroHoverStrength`) crossfade the displayed palette toward the hovered section and lean the flow direction. Everything degrades to today's domain-warp gradient when float textures are unavailable, on mobile-when-idle, and under reduced-motion.

**Tech Stack:** React 19, raw WebGL1 (no new deps), Framer Motion MotionValues, Vite. **No unit-test runner exists** in this repo — verification per task uses `npm run lint`, `node scripts/console-check.mjs` (shader compile / white-screen), `node scripts/screenshot.mjs <set>` (visual diff, software WebGL), `npm run build`, and a live `npm run dev` check. Treat those as the test gates.

**Spec:** [docs/superpowers/specs/2026-06-14-hero-fluid-gradient-redesign-design.md](../specs/2026-06-14-hero-fluid-gradient-redesign-design.md)

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/components/hero/heroThemes.js` | create | Per-state Hero element colors (rest + per-section hover) → CSS var map |
| `src/components/Hero.jsx` | modify | Apply theme vars (rest now, hover later); register hover signals; remove old cobalt color-state machine |
| `src/components/hero/OrbitBubble.jsx` | modify | Point bubble fill/text/shadow at the new `--hero-*` vars |
| `src/components/gradient/gradientConfig.js` | modify | Add `SIM`, `FLOW_ANGLES`, `HOVER` constants |
| `src/components/gradient/simShaders.js` | create | GLSL for the sim passes (advect / splat / divergence / jacobi / gradientSubtract) |
| `src/components/gradient/fluidSim.js` | create | Sim engine: capability detect, textures/FBOs, `step()`, `velocityTexture`, `dispose()` |
| `src/components/gradient/glRenderer.js` | modify | Sampler-texture binding in `setUniforms`; render-state hygiene; expose `gl` |
| `src/components/gradient/shaders.js` | modify | Display frag: velocity displacement + wake highlight + flow lean + hover-palette crossfade |
| `src/components/gradient/FluidGradient.jsx` | modify | Orchestrate sim vs. fallback; pointer (mouse+touch); idle gating; hover uniforms |
| `CLAUDE.md`, `docs/ARCHITECTURE.md` | modify | Document the sim layer, new signals, and revised mobile behavior |

Phases are ordered so the app renders and is committable after every task. Phase 1 ships a readable Hero on its own; Phase 2 adds the desktop liquid; Phase 3 adds hover preview; Phase 4 adds mobile touch; Phase 5 is docs + final verification.

---

## Phase 1 — Hero readability (independent, shippable)

### Task 1: Cream elements on the cobalt field (at rest)

**Files:**
- Create: `src/components/hero/heroThemes.js`
- Modify: `src/components/Hero.jsx`
- Modify: `src/components/hero/OrbitBubble.jsx`

- [ ] **Step 1: Create the element-theme table**

Create `src/components/hero/heroThemes.js`:

```js
/**
 * heroThemes.js — Single source of truth for Hero element colours.
 *
 * Drives CSS custom properties that colour the wordmark, nav bubbles, and
 * name tag. `HERO_REST` is the at-rest look (cream elements on the cobalt
 * field). `HERO_HOVER` previews each destination section and is applied
 * together with the gradient field shift (Phase 3).
 *
 * Rule: light field → dark elements; dark field → light elements.
 * Keys in HERO_HOVER are SECTIONS indices (1=About,2=Projects,3=Gallery,4=Contact).
 */
const CREAM = '245, 240, 232'
const COBALT = '27, 58, 140'
const NEAR_BLACK = '10, 10, 14'

export const HERO_REST = { wordmark: CREAM, bubbleFill: CREAM, bubbleText: COBALT, name: CREAM }

export const HERO_HOVER = {
  1: { wordmark: CREAM,  bubbleFill: CREAM,  bubbleText: COBALT,     name: CREAM },  // About — dark field
  2: { wordmark: COBALT, bubbleFill: COBALT, bubbleText: CREAM,      name: COBALT }, // Projects — light field
  3: { wordmark: CREAM,  bubbleFill: CREAM,  bubbleText: NEAR_BLACK, name: CREAM },  // Gallery — dark field
  4: { wordmark: CREAM,  bubbleFill: CREAM,  bubbleText: NEAR_BLACK, name: CREAM },  // Contact — dark field
}

/** Apply a theme's colours to documentElement as --hero-* custom properties. */
export function applyHeroTheme(theme) {
  const el = document.documentElement
  el.style.setProperty('--hero-wordmark', `rgb(${theme.wordmark})`)
  el.style.setProperty('--hero-bubble-fill', `rgb(${theme.bubbleFill})`)
  el.style.setProperty('--hero-bubble-text', `rgb(${theme.bubbleText})`)
  el.style.setProperty('--hero-name-rgb', theme.name)
}

export function clearHeroTheme() {
  const el = document.documentElement
  for (const v of ['--hero-wordmark', '--hero-bubble-fill', '--hero-bubble-text', '--hero-name-rgb'])
    el.style.removeProperty(v)
}
```

- [ ] **Step 2: Replace Hero's cobalt color-state machine with the rest theme**

In `src/components/Hero.jsx`: delete the dynamic color block — `colorState`, `animationRef`, `updateColor` (lines ~67–136), the `useMotionValueEvent(scrollYProgress, ...)` call, and the two effects that call `updateColor` / clean up the `--color-cobalt*` vars (lines ~138–154). Replace with a single effect:

```jsx
import { HERO_REST, applyHeroTheme, clearHeroTheme } from './hero/heroThemes'

// ...inside Hero(), replacing the deleted color machinery:
useEffect(() => {
  applyHeroTheme(HERO_REST)
  return clearHeroTheme
}, [])
```

Keep `hovIdx`/`setHovIdx` (still used for the bubble scale + mobile tap-flash) and everything else. The `navigate()` mobile tap-flash still calls `setHovIdx`; that's fine — Phase 3 makes hover drive color.

- [ ] **Step 3: Point the wordmark + name tag at the new vars**

In `src/components/Hero.jsx`, the name tag `<motion.p>` currently sets `'--shine-base': 'rgba(var(--color-cobalt-rgb), 0.55)'` and the dot uses `--color-cobalt-rgb`. Change both to `--hero-name-rgb`:

```jsx
style={{ y: nameY, opacity: nameOpacity, zIndex: 50, '--shine-base': 'rgba(var(--hero-name-rgb), 0.55)' }}
```
```jsx
style={{ width: '5px', height: '5px', backgroundColor: 'rgba(var(--hero-name-rgb), 0.45)' }}
```

For the wordmark, pass an explicit className + color so it no longer uses the default `text-cobalt`:

```jsx
<ElasticHeading
  ariaLabel="Andrew Jiang — Portfolio. Developer and designer."
  className="font-display leading-none select-none"
  style={{
    fontSize: 'var(--text-hero)',
    letterSpacing: '-0.01em',
    color: 'var(--hero-wordmark)',
  }}
/>
```

The bottom fade overlay uses `var(--color-cobalt)` — leave it (that token still exists in `index.css`).

- [ ] **Step 4: Point the bubbles at the new vars**

In `src/components/hero/OrbitBubble.jsx`, the `animate` prop and `style` reference `--color-cobalt` / `--color-cobalt-rgb` / `--color-cobalt-text`. Change to the hero vars and a fixed elevation shadow:

```jsx
animate={{
  borderRadius: isHovered ? BLOB_ACTIVE : blobShape,
  scale:   isHovered ? 2.25 : shrunkScale,
  opacity: 1,
  backgroundColor: 'var(--hero-bubble-fill)',
  boxShadow: isHovered
    ? '0 16px 44px rgba(12, 20, 50, 0.45)'
    : isShrunk
    ? '0 2px 10px rgba(12, 20, 50, 0.18)'
    : '0 4px 18px rgba(12, 20, 50, 0.26)',
}}
```
```jsx
style={{
  color: 'var(--hero-bubble-text)',
  fontSize: 'var(--text-label)',
  padding: '0.625rem 1.25rem',
  borderRadius: blobShape,
  overflow: 'visible',
}}
```

- [ ] **Step 5: Verify (lint + console + live)**

Run: `npm run lint`
Expected: 0 problems (no unused `animate`/`useMotionValueEvent` imports left — remove any now-unused imports from Hero.jsx, e.g. `animate`, `useMotionValueEvent`, `useCallback`).

Run (dev server in another terminal: `npm run dev`): `node scripts/console-check.mjs`
Expected: no console errors; root size non-zero.

Live: open `http://localhost:5173`. The wordmark is cream, the four bubbles are cream with cobalt text, the name tag is cream — all clearly readable on the cobalt field. Hovering a bubble scales it (no color change yet).

- [ ] **Step 6: Screenshot baseline + commit**

Run: `node scripts/screenshot.mjs hero-contrast`
Expected: writes `scripts/shots/hero-contrast/` for desktop/tablet/mobile.

```bash
git add src/components/hero/heroThemes.js src/components/Hero.jsx src/components/hero/OrbitBubble.jsx
git commit -m "feat(hero): cream elements on cobalt field for readability"
```

---

## Phase 2 — Desktop liquid push + wake

### Task 2: Add sim/flow/hover constants

**Files:**
- Modify: `src/components/gradient/gradientConfig.js`

- [ ] **Step 1: Append constants**

Add to the end of `src/components/gradient/gradientConfig.js`:

```js
// Fluid sim (Stam velocity field). Numbers are starting points — tune live.
export const SIM = {
  RES_DESKTOP: 256,     // sim grid (square)
  RES_MOBILE: 128,
  JACOBI_DESKTOP: 20,   // pressure-solve iterations
  JACOBI_MOBILE: 12,
  DT: 1.0,              // advection step (folded with FORCE/dissipation)
  VEL_DISSIPATION: 0.985, // velocity decay per frame → wake settles
  SPLAT_RADIUS: 0.0035, // gaussian denominator (smaller = tighter)
  FORCE: 0.9,           // pointer-velocity → injected force scale
  FORCE_CLAMP: 0.06,    // max |pointer delta| (uv/frame) contributing to force
  DISP_SCALE: 0.16,     // velocity → display warp displacement
  WAKE_BOOST: 0.5,      // wake highlight intensity from |velocity|
  SETTLE_EPS: 0.0006,   // residual speed below which the sim idles
}

// Per-section flow lean (radians, screen-space) applied on hover. Keyed by id.
export const FLOW_ANGLES = {
  hero:     0.0,
  about:    Math.PI * 0.30,  // up-right
  projects: 0.0,             // right
  gallery: -Math.PI * 0.5,   // down
  contact:  Math.PI,         // left
}

export const HOVER = { CROSSFADE_SEC: 0.35 } // field + element recolor duration
```

- [ ] **Step 2: Verify + commit**

Run: `npm run lint`
Expected: 0 problems.

```bash
git add src/components/gradient/gradientConfig.js
git commit -m "feat(gradient): add fluid-sim, flow-angle, and hover constants"
```

### Task 3: Teach the renderer to bind sampler textures + render-state hygiene

**Files:**
- Modify: `src/components/gradient/glRenderer.js`

When the sim and display share one GL context, the display pass must restore its own quad/viewport/framebuffer each draw, and `setUniforms` must accept textures.

- [ ] **Step 1: Expose `gl` and accept sampler uniforms**

In `src/components/gradient/glRenderer.js`, change the returned object. Add `gl` to the API and handle texture values in `setUniforms` (a texture is passed as `{ tex, unit }`):

```js
return {
  supported: true,
  gl,
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
      if (v && typeof v === 'object' && 'tex' in v) {
        gl.activeTexture(gl.TEXTURE0 + v.unit)
        gl.bindTexture(gl.TEXTURE_2D, v.tex)
        gl.uniform1i(l, v.unit)
      } else if (typeof v === 'number') gl.uniform1f(l, v)
      else if (v.length === 2) gl.uniform2f(l, v[0], v[1])
      else if (v.length === 3) gl.uniform3f(l, v[0], v[1], v[2])
    }
  },
  render() {
    gl.bindFramebuffer(gl.FRAMEBUFFER, null)
    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  },
  dispose() {
    gl.deleteBuffer(buffer)
    gl.deleteProgram(program)
    // (unchanged note about not calling loseContext)
  },
}
```

Note: `setUniforms` runs before `render()` in the existing loop; binding the display program in `render()` (added above) means the `gl.useProgram(program)` at module init is no longer load-bearing but harmless — leave it.

- [ ] **Step 2: Verify + commit**

Run: `npm run lint` then `node scripts/console-check.mjs` (dev running)
Expected: 0 lint problems; no console errors; gradient still renders identically (no sim yet).

```bash
git add src/components/gradient/glRenderer.js
git commit -m "feat(gradient): renderer binds sampler textures + restores draw state"
```

### Task 4: Sim shaders

**Files:**
- Create: `src/components/gradient/simShaders.js`

- [ ] **Step 1: Write the GLSL**

Create `src/components/gradient/simShaders.js`:

```js
/**
 * simShaders.js — GLSL for the low-res velocity fluid sim (WebGL1, GLSL ES 1.00).
 *
 * Standard Jos Stam "Stable Fluids" passes. Velocity is stored in the .xy
 * channels of an RGBA float/half-float texture; pressure/divergence in .x.
 * Written from scratch (jwagner/fluidwebgl is reference only — not OSS).
 */
export const SIM_VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() { vUv = aPos * 0.5 + 0.5; gl_Position = vec4(aPos, 0.0, 1.0); }
`

export const ADVECT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexel;
uniform float uDt;
uniform float uDissipation;
void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec2 coord = vUv - uDt * vel * uTexel;
  gl_FragColor = uDissipation * texture2D(uSource, coord);
}
`

export const SPLAT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uTarget;
uniform vec2 uPoint;
uniform vec2 uValue;   // injected velocity
uniform float uRadius;
uniform float uAspect;
void main() {
  vec2 d = vUv - uPoint; d.x *= uAspect;
  float g = exp(-dot(d, d) / uRadius);
  vec2 base = texture2D(uTarget, vUv).xy;
  gl_FragColor = vec4(base + g * uValue, 0.0, 1.0);
}
`

export const DIVERGENCE_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexel.y)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexel.y)).y;
  float div = 0.5 * ((R - L) + (T - B));
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

export const JACOBI_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  gl_FragColor = vec4((L + R + B + T - div) * 0.25, 0.0, 0.0, 1.0);
}
`

export const GRADIENT_SUBTRACT_FRAG = `
precision highp float;
varying vec2 vUv;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexel;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexel.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexel.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexel.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexel.y)).x;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`
```

- [ ] **Step 2: Verify + commit**

Run: `npm run lint`
Expected: 0 problems (this file only exports strings; compile is verified in Task 7 via console-check).

```bash
git add src/components/gradient/simShaders.js
git commit -m "feat(gradient): GLSL for the velocity fluid-sim passes"
```

### Task 5: Sim engine (`fluidSim.js`)

**Files:**
- Create: `src/components/gradient/fluidSim.js`

- [ ] **Step 1: Write the engine**

Create `src/components/gradient/fluidSim.js`:

```js
/**
 * fluidSim.js — Low-res Stam velocity fluid sim on a shared WebGL1 context.
 *
 * createFluidSim(gl, res) returns a null-safe API:
 *   { supported, step(pointer), velocityTexture, resize(res), dispose() }
 * `pointer` = { x, y, dx, dy, down } in 0..1 uv (origin bottom-left) with
 * per-frame deltas. When float/half-float render targets are unavailable,
 * supported=false and the caller falls back to the plain display gradient.
 */
import {
  SIM_VERT, ADVECT_FRAG, SPLAT_FRAG, DIVERGENCE_FRAG, JACOBI_FRAG, GRADIENT_SUBTRACT_FRAG,
} from './simShaders'
import { SIM } from './gradientConfig'

function compile(gl, type, src) {
  const sh = gl.createShader(type)
  gl.shaderSource(sh, src); gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh); gl.deleteShader(sh)
    throw new Error('sim shader compile: ' + log)
  }
  return sh
}
function makeProgram(gl, frag) {
  const p = gl.createProgram()
  gl.attachShader(p, compile(gl, gl.VERTEX_SHADER, SIM_VERT))
  gl.attachShader(p, compile(gl, gl.FRAGMENT_SHADER, frag))
  gl.linkProgram(p)
  if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('sim link: ' + gl.getProgramInfoLog(p))
  return p
}

function makeTex(gl, res, type) {
  const t = gl.createTexture()
  gl.bindTexture(gl.TEXTURE_2D, t)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, res, res, 0, gl.RGBA, type, null)
  return t
}
function makeFbo(gl, tex) {
  const fbo = gl.createFramebuffer()
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo)
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0)
  return fbo
}
function makeTarget(gl, res, type) {
  const tex = makeTex(gl, res, type)
  const fbo = makeFbo(gl, tex)
  return { tex, fbo }
}
function makeDouble(gl, res, type) {
  let a = makeTarget(gl, res, type), b = makeTarget(gl, res, type)
  return { get read() { return a }, get write() { return b }, swap() { const t = a; a = b; b = t } }
}

function pickFloatType(gl) {
  const half = gl.getExtension('OES_texture_half_float')
  gl.getExtension('OES_texture_half_float_linear')
  gl.getExtension('EXT_color_buffer_half_float')
  const flt = gl.getExtension('OES_texture_float')
  gl.getExtension('OES_texture_float_linear')
  gl.getExtension('WEBGL_color_buffer_float')
  const candidates = []
  if (half) candidates.push(half.HALF_FLOAT_OES)
  if (flt) candidates.push(gl.FLOAT)
  for (const type of candidates) {
    const tex = makeTex(gl, 4, type)
    const fbo = makeFbo(gl, tex)
    const ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE
    gl.deleteFramebuffer(fbo); gl.deleteTexture(tex)
    if (ok) return type
  }
  return null
}

const NOOP = { supported: false, step() {}, get velocityTexture() { return null }, resize() {}, dispose() {} }

export function createFluidSim(gl, res) {
  if (!gl) return NOOP
  const type = pickFloatType(gl)
  if (!type) return NOOP

  let progs
  try {
    progs = {
      advect: makeProgram(gl, ADVECT_FRAG),
      splat: makeProgram(gl, SPLAT_FRAG),
      divergence: makeProgram(gl, DIVERGENCE_FRAG),
      jacobi: makeProgram(gl, JACOBI_FRAG),
      gradient: makeProgram(gl, GRADIENT_SUBTRACT_FRAG),
    }
  } catch (err) { console.error('[fluidSim]', err); return NOOP }

  const quad = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, quad)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)

  let R = res
  let velocity = makeDouble(gl, R, type)
  let divergence = makeTarget(gl, R, type)
  let pressure = makeDouble(gl, R, type)
  let texel = [1 / R, 1 / R]

  const locs = new Map()
  function u(p, name) {
    const k = p + '|' + name
    if (!locs.has(k)) locs.set(k, gl.getUniformLocation(p, name))
    return locs.get(k)
  }
  function bindQuad(p) {
    const a = gl.getAttribLocation(p, 'aPos')
    gl.bindBuffer(gl.ARRAY_BUFFER, quad)
    gl.enableVertexAttribArray(a)
    gl.vertexAttribPointer(a, 2, gl.FLOAT, false, 0, 0)
  }
  function blit(target) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, target.fbo)
    gl.viewport(0, 0, R, R)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
  function tex(unit, t) { gl.activeTexture(gl.TEXTURE0 + unit); gl.bindTexture(gl.TEXTURE_2D, t) }

  function advect(target, source, dissipation) {
    gl.useProgram(progs.advect); bindQuad(progs.advect)
    tex(0, velocity.read.tex); gl.uniform1i(u(progs.advect, 'uVelocity'), 0)
    tex(1, source.read.tex);   gl.uniform1i(u(progs.advect, 'uSource'), 1)
    gl.uniform2f(u(progs.advect, 'uTexel'), texel[0], texel[1])
    gl.uniform1f(u(progs.advect, 'uDt'), SIM.DT)
    gl.uniform1f(u(progs.advect, 'uDissipation'), dissipation)
    blit(target.write); target.swap()
  }

  return {
    supported: true,
    get velocityTexture() { return velocity.read.tex },
    resize(newRes) {
      if (newRes === R) return
      this.dispose(true)
      R = newRes
      velocity = makeDouble(gl, R, type)
      divergence = makeTarget(gl, R, type)
      pressure = makeDouble(gl, R, type)
      texel = [1 / R, 1 / R]
    },
    step(pointer) {
      // advect velocity
      advect(velocity, velocity, SIM.VEL_DISSIPATION)

      // inject force from pointer motion
      if (pointer && pointer.down) {
        gl.useProgram(progs.splat); bindQuad(progs.splat)
        tex(0, velocity.read.tex); gl.uniform1i(u(progs.splat, 'uTarget'), 0)
        gl.uniform2f(u(progs.splat, 'uPoint'), pointer.x, pointer.y)
        const cap = SIM.FORCE_CLAMP
        const dx = Math.max(-cap, Math.min(cap, pointer.dx))
        const dy = Math.max(-cap, Math.min(cap, pointer.dy))
        gl.uniform2f(u(progs.splat, 'uValue'), dx * SIM.FORCE * R, dy * SIM.FORCE * R)
        gl.uniform1f(u(progs.splat, 'uRadius'), SIM.SPLAT_RADIUS)
        gl.uniform1f(u(progs.splat, 'uAspect'), 1.0)
        blit(velocity.write); velocity.swap()
      }

      // divergence
      gl.useProgram(progs.divergence); bindQuad(progs.divergence)
      tex(0, velocity.read.tex); gl.uniform1i(u(progs.divergence, 'uVelocity'), 0)
      gl.uniform2f(u(progs.divergence, 'uTexel'), texel[0], texel[1])
      blit(divergence)

      // clear pressure, then jacobi iterations
      gl.bindFramebuffer(gl.FRAMEBUFFER, pressure.read.fbo)
      gl.viewport(0, 0, R, R); gl.clearColor(0, 0, 0, 1); gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(progs.jacobi); bindQuad(progs.jacobi)
      gl.uniform2f(u(progs.jacobi, 'uTexel'), texel[0], texel[1])
      tex(1, divergence.tex); gl.uniform1i(u(progs.jacobi, 'uDivergence'), 1)
      const iters = pointer && pointer.iters ? pointer.iters : SIM.JACOBI_DESKTOP
      for (let i = 0; i < iters; i++) {
        tex(0, pressure.read.tex); gl.uniform1i(u(progs.jacobi, 'uPressure'), 0)
        blit(pressure.write); pressure.swap()
      }

      // subtract pressure gradient → divergence-free velocity
      gl.useProgram(progs.gradient); bindQuad(progs.gradient)
      gl.uniform2f(u(progs.gradient, 'uTexel'), texel[0], texel[1])
      tex(0, pressure.read.tex);  gl.uniform1i(u(progs.gradient, 'uPressure'), 0)
      tex(1, velocity.read.tex);  gl.uniform1i(u(progs.gradient, 'uVelocity'), 1)
      blit(velocity.write); velocity.swap()
    },
    dispose(keepProgs) {
      for (const d of [velocity, pressure]) {
        gl.deleteTexture(d.read.tex); gl.deleteFramebuffer(d.read.fbo)
        gl.deleteTexture(d.write.tex); gl.deleteFramebuffer(d.write.fbo)
      }
      gl.deleteTexture(divergence.tex); gl.deleteFramebuffer(divergence.fbo)
      if (keepProgs) return
      gl.deleteBuffer(quad)
      for (const p of Object.values(progs)) gl.deleteProgram(p)
    },
  }
}
```

- [ ] **Step 2: Verify lint + commit**

Run: `npm run lint`
Expected: 0 problems.

```bash
git add src/components/gradient/fluidSim.js
git commit -m "feat(gradient): low-res Stam velocity fluid-sim engine"
```

### Task 6: Display shader samples velocity (push + wake)

**Files:**
- Modify: `src/components/gradient/shaders.js`

- [ ] **Step 1: Add velocity uniforms + displacement + wake highlight**

In `src/components/gradient/shaders.js` `FRAG_SRC`, add these uniforms after `uniform float uCursorR;`:

```glsl
uniform sampler2D uVelocity;   // sim velocity field (.xy)
uniform float uSimEnabled;     // 1 = sim drives the field, 0 = fallback warp
uniform float uDispScale;      // velocity → warp displacement
uniform float uWakeBoost;      // wake highlight from |velocity|
```

Replace the cursor-warp block (the lines computing `m`, `md`, `infl`, and `r += infl * 0.6;`) with a sim-or-fallback branch, and add the wake highlight right after the palette mix. The warp region becomes:

```glsl
  // liquid displacement from the sim (desktop/touch), else legacy cursor warp
  vec2 vel = texture2D(uVelocity, uv).xy;
  r += uSimEnabled * vel * uDispScale;

  // fallback Gaussian cursor warp only when the sim is off
  vec2 m = uMouse / uResolution.xy;
  m.x *= aspect;
  float md = distance(p, m);
  float infl = uMouseStrength * exp(-(md * md) / (2.0 * uCursorR * uCursorR));
  r += (1.0 - uSimEnabled) * infl * 0.6;
```

Then after `vec3 col = mix(colA, colB, uPalMix);` add:

```glsl
  // wake highlight — advected velocity magnitude leaves a luminous trail
  float speed = length(vel) * uSimEnabled;
  col = mix(col, uCream, clamp(speed * uWakeBoost, 0.0, 0.5));
```

- [ ] **Step 2: Verify (console-check after wiring) + commit**

Run: `npm run lint`
Expected: 0 problems. (Visual/compile verification happens in Task 7 once FluidGradient passes the new uniforms — an unused sampler here is harmless.)

```bash
git add src/components/gradient/shaders.js
git commit -m "feat(gradient): display shader samples sim velocity for push + wake"
```

### Task 7: Orchestrate the sim in FluidGradient (desktop)

**Files:**
- Modify: `src/components/gradient/FluidGradient.jsx`

- [ ] **Step 1: Create the sim, track pointer deltas, step + pass uniforms**

In `src/components/gradient/FluidGradient.jsx`:

Add imports:
```js
import { createFluidSim } from './fluidSim'
import { SIM } from './gradientConfig'   // extend the existing gradientConfig import instead of duplicating
```
(If `SIM` isn't already imported from `gradientConfig`, add it to the existing import line.)

After `const renderer = createGradientRenderer(canvas)` and its `if (!renderer.supported) return`, create the sim and pointer state:

```js
const simRes = isMobile ? SIM.RES_MOBILE : SIM.RES_DESKTOP
const sim = createFluidSim(renderer.gl, simRes)
const simActive = sim.supported && !reduceMotion   // mobile gating handled per-frame in Task 10

// pointer in uv (origin bottom-left) + per-frame delta
const pointer = { x: -1, y: -1, px: -1, py: -1, dx: 0, dy: 0, down: false, lastMove: 0 }
```

Update `onMove` to also feed the pointer (keep the existing `mouse`/`lastMove` lines for the fallback warp):

```js
const onMove = (e) => {
  mouse.x = e.clientX
  mouse.y = h - e.clientY
  lastMove = performance.now()
  const nx = e.clientX / w
  const ny = (h - e.clientY) / h
  pointer.dx = pointer.x < 0 ? 0 : nx - pointer.x
  pointer.dy = pointer.y < 0 ? 0 : ny - pointer.y
  pointer.x = nx; pointer.y = ny
  pointer.down = true
  pointer.lastMove = performance.now()
}
```

In `onLeave`, also clear the pointer:
```js
const onLeave = () => { mouse.x = -9999; mouse.y = -9999; mouseStrength = 0; pointer.down = false }
```

- [ ] **Step 2: Step the sim each frame with idle gating; pass uniforms**

In `draw(now)`, before `renderer.setUniforms(...)`, add the sim step + decide `uSimEnabled`:

```js
// pointer goes "up" shortly after motion stops, but the sim keeps running
// until the wake settles (idle gating) so it costs nothing at rest.
if (now - pointer.lastMove > 90) pointer.dx = pointer.dy = 0
let simOn = 0
if (simActive && !isMobile) {
  const moving = (now - pointer.lastMove) < 400 || Math.abs(pointer.dx) + Math.abs(pointer.dy) > SIM.SETTLE_EPS
  // step while interacting or wake still settling; cheap idle otherwise
  if (moving || lastSimStepHadEnergy) {
    pointer.iters = SIM.JACOBI_DESKTOP
    sim.step(pointer)
    lastSimStepHadEnergy = moving
  }
  simOn = 1
}
```

Declare `let lastSimStepHadEnergy = false` next to the other loop locals (near `let lastDraw = 0`).

Then extend the `renderer.setUniforms({ ... })` object with:
```js
uVelocity: simOn ? { tex: sim.velocityTexture, unit: 1 } : { tex: sim.velocityTexture, unit: 1 },
uSimEnabled: simOn,
uDispScale: SIM.DISP_SCALE,
uWakeBoost: SIM.WAKE_BOOST,
```
(When `sim.velocityTexture` is null in the fallback build, pass `uSimEnabled: 0` and a dummy — guard: if `!sim.supported`, set `uVelocity` to `{ tex: null, unit: 1 }` and `uSimEnabled: 0`; binding a null texture with `uSimEnabled=0` is safe because the shader multiplies its contribution by 0. Confirm no console error in Step 4; if a null-bind warning appears, create a 1×1 placeholder texture in Task 5 and return it from `velocityTexture` when unsupported.)

Add `sim.dispose()` to the cleanup return (before/after `renderer.dispose()`):
```js
return () => {
  if (rafId) cancelAnimationFrame(rafId)
  window.removeEventListener('resize', resize)
  window.removeEventListener('mousemove', onMove)
  window.removeEventListener('mouseleave', onLeave)
  document.removeEventListener('visibilitychange', onVisibility)
  sim.dispose()
  renderer.dispose()
}
```

- [ ] **Step 3: Verify compile + live desktop ripple**

Run (dev running): `node scripts/console-check.mjs`
Expected: no console errors (sim + display shaders compiled, samplers bound). If you see "compile" or framebuffer errors, fix before continuing.

Live (`http://localhost:5173`, desktop width): moving the mouse over the Hero pushes the field and leaves a wake that settles when you stop. With software WebGL the harness may report the fallback — that's fine; verify the ripple in a real browser.

- [ ] **Step 4: Screenshot + commit**

Run: `node scripts/screenshot.mjs sim-desktop`
Expected: writes `scripts/shots/sim-desktop/`. Compare against `hero-contrast` — palette/contrast unchanged at rest.

```bash
git add src/components/gradient/FluidGradient.jsx
git commit -m "feat(gradient): drive desktop liquid push + wake from the fluid sim"
```

---

## Phase 3 — Hover preview (field color + flow + element recolor)

### Task 8: Display shader — flow lean + hover-palette crossfade

**Files:**
- Modify: `src/components/gradient/shaders.js`

- [ ] **Step 1: Add hover/flow uniforms and apply them**

In `FRAG_SRC`, add after the velocity uniforms from Task 6:

```glsl
uniform vec2  uFlowDir;        // hover flow lean (screen-space), 0 at rest
uniform vec3  uHoverPal0, uHoverPal1, uHoverPal2;
uniform float uHoverMix;       // 0..1 crossfade toward the hovered palette
```

Apply the flow lean by biasing the second warp octave. Change the `r` computation:

```glsl
  vec2 r = vec2(fbm(p + q + vec2(1.7, 9.2) + 0.15 * t + uFlowDir),
                fbm(p + q + vec2(8.3, 2.8) - 0.12 * t + uFlowDir.yx));
```

Apply the hover-palette crossfade right after `vec3 col = mix(colA, colB, uPalMix);` (before the wake highlight):

```glsl
  vec3 hov = palette(uHoverPal0, uHoverPal1, uHoverPal2, n);
  col = mix(col, hov, uHoverMix);
```

- [ ] **Step 2: Verify + commit**

Run: `npm run lint` then `node scripts/console-check.mjs`
Expected: 0 problems; no console errors; field unchanged at rest (uHoverMix defaults to 0 / uFlowDir 0 until Task 9 wires them).

```bash
git add src/components/gradient/shaders.js
git commit -m "feat(gradient): shader supports hover-palette crossfade + flow lean"
```

### Task 9: Wire hover signals (Hero → gradient) + element recolor

**Files:**
- Modify: `src/components/Hero.jsx`
- Modify: `src/components/gradient/FluidGradient.jsx`

- [ ] **Step 1: Hero registers signals and recolors elements on hover**

In `src/components/Hero.jsx`:

Add imports:
```js
import { useMotionValue, animate } from 'framer-motion'   // ensure these are imported
import { useGradientSignal } from '../context/GradientContext'
import { HERO_REST, HERO_HOVER, applyHeroTheme, clearHeroTheme } from './hero/heroThemes'
import { HOVER } from '../components/gradient/gradientConfig'   // adjust relative path: '../components/gradient/gradientConfig' from src/components → use './gradient/gradientConfig'
```
(Correct path from `src/components/Hero.jsx` is `./gradient/gradientConfig`.)

Create + register the hover signals inside `Hero()`:
```js
const heroHover = useMotionValue(-1)          // SECTIONS index, -1 = none
const heroHoverStrength = useMotionValue(0)   // 0..1, rests at 0
useGradientSignal('heroHover', heroHover)
useGradientSignal('heroHoverStrength', heroHoverStrength)
const recolorRef = useRef(null)
```

Replace the rest-only effect from Task 1 with a hover-reactive one:
```js
useEffect(() => {
  applyHeroTheme(HERO_REST)
  return clearHeroTheme
}, [])

// Drive field signals + element recolor when a bubble is hovered (only at the
// top of Hero — bubbles fade past that). hovIdx is the NAV index (0..3);
// SECTIONS index is hovIdx + 1.
useEffect(() => {
  const atTop = scrollYProgress.get() <= 0.05 && !isTransitionActiveRef.current
  const sectionIdx = hovIdx == null ? -1 : hovIdx + 1
  const active = atTop && sectionIdx > 0

  heroHover.set(active ? sectionIdx : -1)
  animate(heroHoverStrength, active ? 1 : 0, { duration: HOVER.CROSSFADE_SEC, ease: 'easeOut' })

  const theme = active ? HERO_HOVER[sectionIdx] : HERO_REST
  recolorRef.current?.stop()
  // animate the CSS vars by crossfading via a tween on a 0..1 driver
  const from = HERO_REST  // visual start point is fine; CSS transitions smooth it
  recolorRef.current = animate(0, 1, {
    duration: HOVER.CROSSFADE_SEC, ease: 'easeOut',
    onUpdate: () => applyHeroTheme(theme),   // theme is constant; see note
  })
  applyHeroTheme(theme)
}, [hovIdx, heroHover, heroHoverStrength, scrollYProgress])
```

Note: element colors crossfade smoothly via a CSS transition rather than per-channel JS lerp. Add to the wordmark/name/bubble consumers a `transition` on color/background (Step 2). The `recolorRef` tween is optional smoothing; if it reads awkward, set theme directly and rely on the CSS transition.

- [ ] **Step 2: Add CSS transitions so recolor matches the field crossfade**

In `src/components/hero/OrbitBubble.jsx`, the bubble already animates `backgroundColor`/`color` via Framer's `animate` spring — that covers smoothing. No change needed if backgroundColor/color are in the `animate` object (they are after Task 1). Confirm `transition` covers them (the existing `{ type: 'spring', stiffness: 500, damping: 28 }` does).

For the wordmark + name tag (plain motion elements), add an inline `transition: 'color 0.35s ease'` to their style so the var change eases:
- Wordmark `style`: add `transition: 'color 0.35s ease'`.
- Name tag `<motion.p>` style: add `transition: 'color 0.35s ease'` (color is inherited; the dot uses background — add `transition` there too if desired).

- [ ] **Step 3: FluidGradient reads hover signals → uniforms**

In `src/components/gradient/FluidGradient.jsx`, import palettes + config helpers already present (`SECTION_PALETTES`, `SECTIONS`). Add `FLOW_ANGLES` to the gradientConfig import.

Add a helper near `paletteUniforms()`:
```js
const REST_HOVER = { uHoverPal0: COBALT, uHoverPal1: COBALT, uHoverPal2: COBALT, uHoverMix: 0, uFlowDir: [0, 0] }

function hoverUniforms(activeIdx) {
  const hov = sig('heroHover')        // SECTIONS index or -1
  const strength = sig('heroHoverStrength')
  // only while Hero holds the viewport centre
  if (activeIdx !== 0 || hov < 0 || strength <= 0.001) return REST_HOVER
  const section = SECTIONS[Math.round(hov)]
  const stops = SECTION_PALETTES[section.id].stops
  const ang = FLOW_ANGLES[section.id] ?? 0
  return {
    uHoverPal0: stops[0], uHoverPal1: stops[1], uHoverPal2: stops[2],
    uHoverMix: strength,
    uFlowDir: [Math.cos(ang) * strength * 1.5, Math.sin(ang) * strength * 1.5],
  }
}
```

`paletteUniforms()` already computes the active section index `idx`; return it so `draw` can pass it to `hoverUniforms`. Either refactor `paletteUniforms` to also return `idx`, or recompute the active index. Simplest: have `paletteUniforms` attach `__idx: idx` to its return and read it:

```js
// in paletteUniforms return object, add:
__idx: idx,
```
```js
// in draw(), after const pal = paletteUniforms():
const pal = paletteUniforms()
const hoverU = hoverUniforms(pal.__idx)
```

Extend the `renderer.setUniforms({ ... })` object: spread `...hoverU` (and remove the `__idx` key before upload — `setUniforms` skips unknown uniform names, so leaving `__idx` in `...pal` is harmless since `loc('__idx')` is null; acceptable).

- [ ] **Step 4: Verify live hover preview**

Run (dev running): `node scripts/console-check.mjs`
Expected: no errors.

Live: at the top of Hero, hover each bubble. Field crossfades toward that section's palette and the flow leans in its direction; wordmark/bubbles recolor in sync (Projects → cobalt elements on cream field; Gallery/Contact → cream elements on near-black; About → cream on brighter cobalt). Moving off returns to rest (cobalt + cream). Scroll down a little and confirm hover no longer shifts the field (gated to top).

- [ ] **Step 5: Screenshot + commit**

Run: `node scripts/screenshot.mjs sim-hover`
Expected: writes `scripts/shots/sim-hover/`.

```bash
git add src/components/Hero.jsx src/components/hero/OrbitBubble.jsx src/components/gradient/FluidGradient.jsx
git commit -m "feat(hero): hover previews each section's palette, flow, and element colors"
```

---

## Phase 4 — Mobile touch-driven sim

### Task 10: Touch pointer + mobile sim budget

**Files:**
- Modify: `src/components/gradient/FluidGradient.jsx`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Feed touch into the pointer (passive, no preventDefault)**

In `src/components/gradient/FluidGradient.jsx`, add touch handlers mirroring `onMove`, registered passively. After the `onMove`/`onLeave` definitions:

```js
const onTouch = (e) => {
  const tch = e.touches && e.touches[0]
  if (!tch) return
  const nx = tch.clientX / w
  const ny = (h - tch.clientY) / h
  pointer.dx = pointer.x < 0 ? 0 : nx - pointer.x
  pointer.dy = pointer.y < 0 ? 0 : ny - pointer.y
  pointer.x = nx; pointer.y = ny
  pointer.down = true
  pointer.lastMove = performance.now()
}
const onTouchEnd = () => { pointer.down = false }
```

Register them (passive so scrolling/navigation are never blocked):
```js
window.addEventListener('touchstart', onTouch, { passive: true })
window.addEventListener('touchmove', onTouch, { passive: true })
window.addEventListener('touchend', onTouchEnd, { passive: true })
```
And remove them in cleanup:
```js
window.removeEventListener('touchstart', onTouch)
window.removeEventListener('touchmove', onTouch)
window.removeEventListener('touchend', onTouchEnd)
```

- [ ] **Step 2: Enable the sim on mobile, gated + reduced budget**

Change the Task 7 gating so mobile runs the sim **only while touch is active or the wake is settling**, with fewer iterations. Replace the `if (simActive && !isMobile)` block with:

```js
let simOn = 0
if (simActive) {
  const recentlyMoved = (now - pointer.lastMove) < 400
  const moving = recentlyMoved || Math.abs(pointer.dx) + Math.abs(pointer.dy) > SIM.SETTLE_EPS
  if (isMobile) {
    // mobile: zero cost when idle — step only on active touch + short settle
    if (pointer.down || recentlyMoved || lastSimStepHadEnergy) {
      pointer.iters = SIM.JACOBI_MOBILE
      sim.step(pointer)
      lastSimStepHadEnergy = pointer.down || recentlyMoved
      simOn = 1
    } else {
      simOn = lastSimStepHadEnergy ? 1 : 0
    }
  } else {
    if (moving || lastSimStepHadEnergy) {
      pointer.iters = SIM.JACOBI_DESKTOP
      sim.step(pointer)
      lastSimStepHadEnergy = moving
    }
    simOn = 1
  }
}
```

Also remove the now-obsolete `if (isMobile) mouseStrength = 0` early-return interference: keep `mouseStrength` logic for the desktop fallback only. The existing line `if (isMobile) mouseStrength = 0` stays (mobile never uses the Gaussian fallback warp).

- [ ] **Step 3: Update CLAUDE.md mobile note**

In `CLAUDE.md`, the Responsive bullet says "The gradient renders at half resolution and disables cursor warp on mobile." Replace with:

```
mobile. The gradient renders at half resolution; on mobile the fluid sim is
touch-driven (tap/drag) and runs only while a touch is active plus a short
settle, falling back to the static gradient where float textures are
unavailable.
```

- [ ] **Step 4: Verify live (touch emulation) + commit**

Run (dev running): `node scripts/console-check.mjs`
Expected: no errors.

Live: in browser devtools device mode (or a phone), drag on the Hero — the field ripples and the drag still scrolls (never blocked). Idle = no ripple. Tap a bubble still navigates.

Run: `node scripts/screenshot.mjs sim-mobile`
Expected: writes `scripts/shots/sim-mobile/` (mobile column should still render the gradient — fallback or sim).

```bash
git add src/components/gradient/FluidGradient.jsx CLAUDE.md
git commit -m "feat(gradient): touch-driven fluid sim on mobile, gated + reduced budget"
```

---

## Phase 5 — Docs + final verification

### Task 11: Architecture docs + full verification pass

**Files:**
- Modify: `docs/ARCHITECTURE.md`
- Modify: `CLAUDE.md` (gotchas/registry if needed)

- [ ] **Step 1: Document the sim layer**

In `docs/ARCHITECTURE.md` (the fluid-gradient guide), add a subsection describing: the hybrid pipeline (sim velocity → display displacement + wake), the new modules (`fluidSim.js`, `simShaders.js`), the new signals (`heroHover` rests at −1, `heroHoverStrength` rests at 0 per the global-signal rule), the new constants block in `gradientConfig.js` (`SIM`, `FLOW_ANGLES`, `HOVER`), and the fallbacks (no float textures / reduced-motion / mobile-idle → plain domain-warp gradient). Cross-reference the spec.

In `CLAUDE.md`, under the gradient gotchas, add: "`heroHover`/`heroHoverStrength` are global signals — `heroHoverStrength` must rest at 0 and `heroHover` at −1 once Hero leaves the viewport, or the hover palette bleeds." And note the sim shares the display GL context, so the display `render()` re-binds its quad/viewport/default framebuffer each frame.

- [ ] **Step 2: Full verification**

Run: `npm run lint`
Expected: 0 problems.

Run: `npm run build`
Expected: build succeeds, no errors.

Run (dev running): `node scripts/console-check.mjs`
Expected: no console errors; root renders.

Run: `node scripts/screenshot.mjs final`
Expected: writes `scripts/shots/final/`. Diff against `hero-contrast` (Phase 1) — at-rest Hero should match; sections below unchanged.

- [ ] **Step 3: Commit**

```bash
git add docs/ARCHITECTURE.md CLAUDE.md
git commit -m "docs: document the fluid-sim gradient layer + hover signals"
```

---

## Self-review notes (coverage)

- **Readability (spec §Visual contract, rest):** Task 1 (cream elements on cobalt).
- **Liquid push + wake (spec §Architecture, sim):** Tasks 2–7 (constants, renderer, sim shaders, sim engine, display sampling, orchestration).
- **Hover literal preview — field color + flow + element recolor (spec §Visual contract, hover):** Tasks 8–9.
- **Mobile touch (spec §Mobile):** Task 10.
- **Fallbacks/contracts (spec §Fallbacks):** float-texture detection (Task 5 `pickFloatType`), `uSimEnabled=0` fallback path (Tasks 6–7), reduced-motion single frame (existing, unchanged), no `loseContext` (Task 5 dispose), idle gating (Tasks 7, 10).
- **Performance (spec §Performance):** ¼-res sim + iteration budget (Task 2), idle gating (Tasks 7, 10).
- **Verification (spec §Verification):** lint/console-check/screenshot/build per task + Task 11 full pass.
- **Docs:** Task 10 (CLAUDE mobile), Task 11 (ARCHITECTURE + CLAUDE gotchas).

**Tuning knobs** (SIM constants, FLOW_ANGLES, About brightness, WAKE_BOOST, DISP_SCALE) are intentionally exposed in `gradientConfig.js` for live dialing during Tasks 7/9/10 — not blocking.
