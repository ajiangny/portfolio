# Three.js Ink-Fluid Background Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the deliberately-subtle custom WebGL1 fluid background with a bold Three.js stable-fluids pipeline that renders per-section colored ink, drifts on its own, and reacts to the cursor.

**Architecture:** A `THREE.WebGLRenderer` drives ping-pong half-float `WebGLRenderTarget`s through a minimal `ShaderPass` helper (one fullscreen-quad fragment program per sim step). `Simulation` runs the fluid (force → advect → divergence → Jacobi pressure → gradient-subtract → dye advect); `FluidScene` owns the renderer + a composite pass that mixes a per-section base gradient toward an ink accent by dye density; `FluidGradient.jsx` is the React shell (RAF loop, pointer/touch, palette selection from DOM rects, mobile/reduced-motion/visibility budget). Pure logic (color lerp, palette selection, ambient point math) is extracted into testable modules covered by `node --test`.

**Tech Stack:** React 19, Vite 8, Three.js (new dep), GLSL ES 1.00, Node's built-in `node:test` runner, Puppeteer verification scripts (`console-check.mjs`, `screenshot.mjs`).

**Spec:** `docs/superpowers/specs/2026-06-16-threejs-ink-fluid-background-design.md`

---

## File structure

```
src/components/gradient/
  FluidGradient.jsx     MODIFY (rewrite body) — React shell + RAF loop
  gradientConfig.js     MODIFY (rewrite)      — per-section base/ink palettes + SIM/GRADIENT tuning
  colors.js             CREATE               — rgb() + lerp3() pure helpers
  paletteSelect.js      CREATE               — selectPalette() pure function
  ambient.js            CREATE               — ambientSplats(time) pure function
  three/
    ShaderPass.js       CREATE — generic fullscreen-quad pass
    shaders.js          CREATE — GLSL strings (VERT, SPLAT, ADVECT, DIVERGENCE, JACOBI, GRADIENT_SUBTRACT, COMPOSITE)
    Simulation.js       CREATE — fluid render targets + per-step passes
    FluidScene.js       CREATE — owns renderer + composite; update/resize/dispose/supported
  glRenderer.js         DELETE
  shaders.js (old)      DELETE  (replaced by three/shaders.js)
  fluidSim.js           DELETE
  simShaders.js         DELETE
src/context/
  GradientContext.js    DELETE
  GradientProvider.jsx  DELETE
src/components/
  Hero.jsx              MODIFY — remove heroHover / heroHoverStrength signals
  About.jsx             MODIFY — remove 'seam' signal
  Projects.jsx          MODIFY — remove 'flood' signal
  Gallery.jsx           MODIFY — remove 'pulse' signal
src/App.jsx             MODIFY — remove <GradientProvider> wrap
test/
  colors.test.mjs       CREATE
  gradientConfig.test.mjs CREATE
  paletteSelect.test.mjs CREATE
  ambient.test.mjs      CREATE
scripts/probe-trail.mjs DELETE (untracked scratch)
package.json            MODIFY — add three
CLAUDE.md               MODIFY — update gradient docs
docs/ARCHITECTURE.md    MODIFY — update gradient docs
```

**Verification commands used throughout** (have the dev server running for the headless checks: `npm run dev` in a background terminal):
- `npm run lint` → must report 0 problems.
- `npm run build` → must succeed.
- `node --test test/` → unit tests for pure modules.
- `node scripts/console-check.mjs` → expect no `[error]`/`[uncaught]` lines and `root innerHTML length:` > 0.
- `node scripts/screenshot.mjs <set>` → visual capture for diffing.

---

## Task 1: Add Three.js dependency + capture baseline

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install three**

Run: `npm install three`
Expected: `three` appears under `dependencies` in `package.json`; `npm install` exits 0.

- [ ] **Step 2: Confirm the app still builds**

Run: `npm run build`
Expected: build succeeds (three is installed but not yet imported).

- [ ] **Step 3: Capture the pre-change baseline screenshots**

Ensure the dev server is running (`npm run dev`), then run:
`node scripts/screenshot.mjs baseline`
Expected: `scripts/shots/baseline/` is populated with desktop/tablet/mobile captures of all five sections. (This records the current broken-fluid state for later diffing — text/layout must not regress.)

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json
git commit -m "build: add three.js dependency for fluid background"
```

---

## Task 2: `colors.js` pure helpers (TDD)

**Files:**
- Create: `src/components/gradient/colors.js`
- Test: `test/colors.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/colors.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rgb, lerp3 } from '../src/components/gradient/colors.js'

test('rgb normalizes 8-bit channels to 0..1', () => {
  assert.deepEqual(rgb(255, 0, 128), [1, 0, 128 / 255])
})

test('lerp3 interpolates each channel', () => {
  assert.deepEqual(lerp3([0, 0, 0], [1, 1, 1], 0), [0, 0, 0])
  assert.deepEqual(lerp3([0, 0, 0], [1, 1, 1], 1), [1, 1, 1])
  assert.deepEqual(lerp3([0, 0, 0], [1, 0.5, 0.25], 0.5), [0.5, 0.25, 0.125])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/colors.test.mjs`
Expected: FAIL — cannot resolve `../src/components/gradient/colors.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/components/gradient/colors.js
// Pure color helpers shared by the gradient config and palette selection.

/** Normalize an 8-bit RGB triple to 0..1 for GLSL/Three. */
export const rgb = (r, g, b) => [r / 255, g / 255, b / 255]

/** Linear-interpolate two [r,g,b] triples by t (0..1). */
export const lerp3 = (a, b, t) => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
]
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/colors.test.mjs`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/colors.js test/colors.test.mjs
git commit -m "feat(gradient): add pure color helpers (rgb, lerp3)"
```

---

## Task 3: Rework `gradientConfig.js` to base/ink palettes + new tuning (TDD)

**Files:**
- Modify: `src/components/gradient/gradientConfig.js` (full rewrite)
- Test: `test/gradientConfig.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/gradientConfig.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { SECTION_PALETTES, SIM, GRADIENT } from '../src/components/gradient/gradientConfig.js'

const IDS = ['hero', 'about', 'projects', 'gallery', 'contact']

test('every section has a 2-stop base and an ink accent in 0..1', () => {
  for (const id of IDS) {
    const p = SECTION_PALETTES[id]
    assert.ok(p, `missing palette: ${id}`)
    assert.equal(p.base.length, 2, `${id}.base must have 2 stops`)
    for (const c of [...p.base, p.ink]) {
      assert.equal(c.length, 3)
      for (const ch of c) assert.ok(ch >= 0 && ch <= 1, `${id} channel out of range: ${ch}`)
    }
  }
})

test('SIM exposes the tuning the renderer reads', () => {
  for (const k of ['RES', 'RES_MOBILE', 'JACOBI', 'JACOBI_MOBILE', 'DT',
    'VEL_DISSIPATION', 'DYE_DISSIPATION', 'SPLAT_RADIUS', 'AMBIENT_RADIUS',
    'CURSOR_FORCE', 'AMBIENT_FORCE', 'FORCE_CLAMP', 'CURSOR_DENSITY',
    'AMBIENT_DENSITY', 'DYE_INTENSITY', 'DYE_MAX', 'REFRACTION']) {
    assert.equal(typeof SIM[k], 'number', `SIM.${k} must be a number`)
  }
})

test('GRADIENT exposes shell tuning', () => {
  for (const k of ['SEAM_FADE', 'MOBILE_SCALE', 'FRAME_MS_MOBILE']) {
    assert.equal(typeof GRADIENT[k], 'number', `GRADIENT.${k} must be a number`)
  }
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/gradientConfig.test.mjs`
Expected: FAIL — current `SECTION_PALETTES` uses `.stops`, not `.base`/`.ink`; new SIM/GRADIENT keys missing.

- [ ] **Step 3: Write the rewrite**

Replace the entire contents of `src/components/gradient/gradientConfig.js` with:

```js
/**
 * gradientConfig.js — Palettes + tuning for the Three.js ink-fluid background.
 *
 * Each section provides a 2-stop `base` (the resting field gradient, top→bottom)
 * kept at a luminance that preserves that section's text contrast, and an `ink`
 * accent that the cursor + ambient drift inject as the visible liquid. The
 * active section is chosen by viewport centre and crossfades toward the next
 * (see paletteSelect.js); the composite mixes base→ink by dye density.
 */
import { rgb } from './colors'

export const SECTION_PALETTES = {
  hero:     { base: [rgb(43, 82, 180), rgb(18, 42, 107)], ink: rgb(190, 224, 255) }, // cobalt field, cool-white ink
  about:    { base: [rgb(43, 82, 180), rgb(18, 42, 107)], ink: rgb(190, 224, 255) }, // cobalt (cream text needs a dark field)
  projects: { base: [rgb(250, 248, 244), rgb(234, 228, 217)], ink: rgb(43, 82, 180) }, // cream field, cobalt ink (dark text needs a light field)
  gallery:  { base: [rgb(20, 30, 64), rgb(0, 0, 0)], ink: rgb(90, 130, 235) }, // black + cobalt glow
  contact:  { base: [rgb(40, 40, 46), rgb(0, 0, 0)], ink: rgb(240, 228, 205) }, // black + warm ink
}

// Stable-fluids sim tuning. Starting points — tune live in Task 12.
export const SIM = {
  RES: 256,            // sim grid short side (px); long side scales with aspect
  RES_MOBILE: 128,
  JACOBI: 18,          // pressure-solve iterations
  JACOBI_MOBILE: 12,
  DT: 1.0,             // fixed advection step (stable regardless of frame time)
  VEL_DISSIPATION: 0.985,  // velocity decay per step
  DYE_DISSIPATION: 0.975,  // ink fade per step
  SPLAT_RADIUS: 0.00045,   // cursor splat tightness (exp denominator, aspect-corrected uv)
  AMBIENT_RADIUS: 0.0022,  // ambient splat (softer/larger)
  CURSOR_FORCE: 4200,      // pointer delta (uv/frame) → injected velocity
  AMBIENT_FORCE: 700,      // ambient point velocity → injected velocity
  FORCE_CLAMP: 0.02,       // max |pointer delta| (uv/frame) contributing to force
  CURSOR_DENSITY: 0.32,    // dye density injected per cursor splat
  AMBIENT_DENSITY: 0.05,   // dye density injected per ambient splat
  DYE_INTENSITY: 1.0,      // dye density multiplier at composite
  DYE_MAX: 0.9,            // clamp so ink never fully hides the base (readability)
  REFRACTION: 0.06,        // velocity → base/dye uv warp (subtle organic wobble)
}

export const GRADIENT = {
  SEAM_FADE: 0.85,      // section progress at which the palette starts crossfading to the next
  MOBILE_SCALE: 0.5,    // render-buffer downscale on mobile (upscaled by CSS)
  FRAME_MS_MOBILE: 33,  // ~30fps throttle on mobile (desktop runs unthrottled)
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/gradientConfig.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/gradientConfig.js test/gradientConfig.test.mjs
git commit -m "feat(gradient): rework config to per-section base/ink palettes + sim tuning"
```

> Note: the app will not lint/build cleanly until Task 9 finishes (old files still import the removed `.stops`/constants). That is expected; integration verification happens in Task 9.

---

## Task 4: `paletteSelect.js` pure palette selection (TDD)

**Files:**
- Create: `src/components/gradient/paletteSelect.js`
- Test: `test/paletteSelect.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/paletteSelect.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { selectPalette } from '../src/components/gradient/paletteSelect.js'

const ORDER = ['a', 'b']
const PALETTES = {
  a: { base: [[0, 0, 0], [0, 0, 0]], ink: [0, 0, 0] },
  b: { base: [[1, 1, 1], [1, 1, 1]], ink: [1, 1, 1] },
}
// rects aligned to ORDER; viewport centre at y=50
const rect = (top, height) => ({ top, bottom: top + height, height })

test('picks the section holding the centre, no crossfade before seamFade', () => {
  const rects = [rect(0, 100), rect(100, 100)] // centre 50 is in 'a', through=0.5
  const p = selectPalette(rects, 50, ORDER, PALETTES, 0.85)
  assert.deepEqual(p.base0, [0, 0, 0])
  assert.deepEqual(p.ink, [0, 0, 0])
})

test('crossfades toward the next section past seamFade', () => {
  // centre at 90 inside 'a' (top 0 h 100) → through=0.9; seamFade 0.8 → mix=0.5
  const rects = [rect(0, 100), rect(100, 100)]
  const p = selectPalette(rects, 90, ORDER, PALETTES, 0.8)
  assert.deepEqual(p.ink, [0.5, 0.5, 0.5])
})

test('clamps to last section when centre is past everything', () => {
  const rects = [rect(-200, 100), rect(-100, 100)] // both above centre 50
  const p = selectPalette(rects, 50, ORDER, PALETTES, 0.85)
  assert.deepEqual(p.ink, [1, 1, 1]) // last section 'b'
})

test('skips missing rects (null elements)', () => {
  const rects = [null, rect(0, 100)]
  const p = selectPalette(rects, 50, ORDER, PALETTES, 0.85)
  assert.deepEqual(p.ink, [1, 1, 1])
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/paletteSelect.test.mjs`
Expected: FAIL — cannot resolve `paletteSelect.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/components/gradient/paletteSelect.js
// Pure: choose the active section palette by viewport centre and crossfade
// toward the next once the section's progress passes seamFade.
import { lerp3 } from './colors'

/**
 * @param {Array<{top:number,bottom:number,height:number}|null>} rects aligned to `order`
 * @param {number} centerY viewport-centre y (same coord space as rect top/bottom)
 * @param {string[]} order section ids in document order
 * @param {Record<string,{base:[number[],number[]],ink:number[]}>} palettes
 * @param {number} seamFade progress at which crossfade begins
 * @returns {{base0:number[], base1:number[], ink:number[]}}
 */
export function selectPalette(rects, centerY, order, palettes, seamFade) {
  let idx = 0
  let through = 0
  for (let i = 0; i < order.length; i++) {
    const r = rects[i]
    if (!r) continue
    if (r.top <= centerY && centerY < r.bottom) {
      idx = i
      through = r.height > 0 ? (centerY - r.top) / r.height : 0
      break
    }
    if (centerY >= r.bottom) idx = i // fallback: last passed section
  }
  const cur = palettes[order[idx]]
  const nxt = palettes[order[Math.min(idx + 1, order.length - 1)]]
  const mix = through > seamFade ? (through - seamFade) / (1 - seamFade) : 0
  return {
    base0: lerp3(cur.base[0], nxt.base[0], mix),
    base1: lerp3(cur.base[1], nxt.base[1], mix),
    ink: lerp3(cur.ink, nxt.ink, mix),
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/paletteSelect.test.mjs`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/paletteSelect.js test/paletteSelect.test.mjs
git commit -m "feat(gradient): pure per-section palette selection + crossfade"
```

---

## Task 5: `ambient.js` ambient splat points (TDD)

**Files:**
- Create: `src/components/gradient/ambient.js`
- Test: `test/ambient.test.mjs`

- [ ] **Step 1: Write the failing test**

```js
// test/ambient.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ambientSplats } from '../src/components/gradient/ambient.js'

test('returns 3 points inside the field with finite velocity', () => {
  for (const t of [0, 1.5, 42]) {
    const pts = ambientSplats(t)
    assert.equal(pts.length, 3)
    for (const p of pts) {
      assert.ok(p.x >= 0 && p.x <= 1, `x in range: ${p.x}`)
      assert.ok(p.y >= 0 && p.y <= 1, `y in range: ${p.y}`)
      assert.ok(Number.isFinite(p.dx) && Number.isFinite(p.dy))
    }
  }
})

test('is deterministic for a given time', () => {
  assert.deepEqual(ambientSplats(3.3), ambientSplats(3.3))
})

test('moves over time', () => {
  assert.notDeepEqual(ambientSplats(0), ambientSplats(5))
})
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node --test test/ambient.test.mjs`
Expected: FAIL — cannot resolve `ambient.js`.

- [ ] **Step 3: Write minimal implementation**

```js
// src/components/gradient/ambient.js
// Pure: a few slow points tracing Lissajous paths so the fluid is alive with
// no cursor. Returns positions in 0..1 uv plus analytic velocity (dx,dy) used
// to inject a gentle drift force. Radii keep every point well inside [0,1].
const POINTS = [
  { r: 0.30, ax: 0.13, ay: 0.17, phx: 0.0, phy: 1.3 },
  { r: 0.36, ax: 0.09, ay: 0.11, phx: 2.1, phy: 4.0 },
  { r: 0.22, ax: 0.21, ay: 0.07, phx: 5.0, phy: 0.7 },
]

/** @param {number} t seconds @returns {{x:number,y:number,dx:number,dy:number}[]} */
export function ambientSplats(t) {
  return POINTS.map((p) => ({
    x: 0.5 + p.r * Math.sin(p.ax * t + p.phx),
    y: 0.5 + p.r * Math.cos(p.ay * t + p.phy),
    dx: p.r * p.ax * Math.cos(p.ax * t + p.phx),
    dy: -p.r * p.ay * Math.sin(p.ay * t + p.phy),
  }))
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `node --test test/ambient.test.mjs`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/ambient.js test/ambient.test.mjs
git commit -m "feat(gradient): pure ambient drift splat points"
```

---

## Task 6: GLSL shaders + `ShaderPass` helper

**Files:**
- Create: `src/components/gradient/three/shaders.js`
- Create: `src/components/gradient/three/ShaderPass.js`

> WebGL modules cannot be unit-tested in Node; they are integration-verified in Task 9. Each step here ends with `npm run lint` to catch syntax/undefined-symbol errors.

- [ ] **Step 1: Create the shaders module**

```js
// src/components/gradient/three/shaders.js
// GLSL ES 1.00 for RawShaderMaterial (no version directive; WebGL2 compiles it).
// RawShaderMaterial injects nothing, so each stage declares its own precision
// and the vertex stage declares the `position` attribute supplied by the plane.

export const VERT = /* glsl */ `
precision highp float;
attribute vec3 position;
varying vec2 vUv;
void main() {
  vUv = position.xy * 0.5 + 0.5;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`

// Additive Gaussian splat of uColor into uTarget at uPoint (aspect-corrected).
export const SPLAT = /* glsl */ `
precision highp float;
uniform sampler2D uTarget;
uniform vec3 uColor;
uniform vec2 uPoint;
uniform float uRadius;
uniform float uAspectRatio;
varying vec2 vUv;
void main() {
  vec2 p = vUv - uPoint;
  p.x *= uAspectRatio;
  vec3 splat = exp(-dot(p, p) / uRadius) * uColor;
  vec3 base = texture2D(uTarget, vUv).xyz;
  gl_FragColor = vec4(base + splat, 1.0);
}
`

// Semi-Lagrangian advection of uSource along uVelocity, with dissipation.
export const ADVECT = /* glsl */ `
precision highp float;
uniform sampler2D uVelocity;
uniform sampler2D uSource;
uniform vec2 uTexelSize;
uniform float uDt;
uniform float uDissipation;
varying vec2 vUv;
void main() {
  vec2 coord = vUv - uDt * texture2D(uVelocity, vUv).xy * uTexelSize;
  gl_FragColor = uDissipation * texture2D(uSource, coord);
}
`

export const DIVERGENCE = /* glsl */ `
precision highp float;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
  float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
  float div = 0.5 * (R - L + T - B);
  gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
}
`

export const JACOBI = /* glsl */ `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uDivergence;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  float div = texture2D(uDivergence, vUv).x;
  float pressure = (L + R + B + T - div) * 0.25;
  gl_FragColor = vec4(pressure, 0.0, 0.0, 1.0);
}
`

export const GRADIENT_SUBTRACT = /* glsl */ `
precision highp float;
uniform sampler2D uPressure;
uniform sampler2D uVelocity;
uniform vec2 uTexelSize;
varying vec2 vUv;
void main() {
  float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
  float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
  float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
  float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vel -= 0.5 * vec2(R - L, T - B);
  gl_FragColor = vec4(vel, 0.0, 1.0);
}
`

// Final picture: a vertical base gradient (base0 top → base1 bottom) mixed
// toward the ink accent by the (clamped) dye density. Velocity adds a subtle
// refraction wobble. Dye density is carried in the red channel.
export const COMPOSITE = /* glsl */ `
precision highp float;
uniform sampler2D uDye;
uniform sampler2D uVelocity;
uniform vec3 uBase0;
uniform vec3 uBase1;
uniform vec3 uInk;
uniform float uDyeIntensity;
uniform float uDyeMax;
uniform float uRefraction;
varying vec2 vUv;
void main() {
  vec2 vel = texture2D(uVelocity, vUv).xy;
  vec2 uv = vUv + vel * uRefraction;
  float density = clamp(texture2D(uDye, uv).x * uDyeIntensity, 0.0, uDyeMax);
  vec3 base = mix(uBase1, uBase0, clamp(uv.y, 0.0, 1.0));
  vec3 color = mix(base, uInk, density);
  gl_FragColor = vec4(color, 1.0);
}
`
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems (the new module is valid JS; not yet imported).

- [ ] **Step 3: Create the ShaderPass helper**

```js
// src/components/gradient/three/ShaderPass.js
// One fullscreen-quad fragment program rendered into a target (or to screen).
// The vertex shader writes clip space directly, so the camera matrices are
// unused — a bare Camera satisfies renderer.render()'s signature.
import {
  RawShaderMaterial, PlaneGeometry, Mesh, Scene, Camera,
} from 'three'

const CAMERA = new Camera()

export class ShaderPass {
  constructor(renderer, { vertexShader, fragmentShader, uniforms }) {
    this.renderer = renderer
    this.material = new RawShaderMaterial({
      vertexShader, fragmentShader, uniforms,
      depthTest: false, depthWrite: false,
    })
    this.geometry = new PlaneGeometry(2, 2)
    this.mesh = new Mesh(this.geometry, this.material)
    this.scene = new Scene()
    this.scene.add(this.mesh)
  }

  get uniforms() { return this.material.uniforms }

  render(target = null) {
    this.renderer.setRenderTarget(target)
    this.renderer.render(this.scene, CAMERA)
  }

  dispose() {
    this.geometry.dispose()
    this.material.dispose()
  }
}
```

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: 0 problems.

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/three/shaders.js src/components/gradient/three/ShaderPass.js
git commit -m "feat(gradient): GLSL fluid shaders + ShaderPass helper"
```

---

## Task 7: `Simulation.js` — the fluid

**Files:**
- Create: `src/components/gradient/three/Simulation.js`

- [ ] **Step 1: Write the module**

```js
// src/components/gradient/three/Simulation.js
// Stable-fluids velocity + dye sim on half-float render targets. Per step:
// inject force/dye (cursor + ambient) → divergence → Jacobi pressure →
// subtract gradient (divergence-free) → advect velocity → advect dye.
import {
  WebGLRenderTarget, HalfFloatType, RGBAFormat, ClampToEdgeWrapping, Vector2, Vector3,
} from 'three'
import { ShaderPass } from './ShaderPass'
import { VERT, SPLAT, ADVECT, DIVERGENCE, JACOBI, GRADIENT_SUBTRACT } from './shaders'
import { SIM } from '../gradientConfig'
import { ambientSplats } from '../ambient'

const clamp = (v, c) => Math.max(-c, Math.min(c, v))

function makeRT(w, h, filter) {
  return new WebGLRenderTarget(w, h, {
    type: HalfFloatType, format: RGBAFormat,
    minFilter: filter, magFilter: filter,
    depthBuffer: false, stencilBuffer: false,
    wrapS: ClampToEdgeWrapping, wrapT: ClampToEdgeWrapping,
  })
}

function makeDouble(w, h, filter) {
  let a = makeRT(w, h, filter)
  let b = makeRT(w, h, filter)
  return {
    get read() { return a },
    get write() { return b },
    swap() { const t = a; a = b; b = t },
    dispose() { a.dispose(); b.dispose() },
  }
}

export class Simulation {
  constructor(renderer, filter) {
    this.renderer = renderer
    this.filter = filter
    this.w = 2
    this.h = 2
    this.texel = new Vector2(0.5, 0.5)

    this.velocity = makeDouble(2, 2, filter)
    this.dye = makeDouble(2, 2, filter)
    this.pressure = makeDouble(2, 2, filter)
    this.divergence = makeRT(2, 2, filter)

    this.splatPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: SPLAT,
      uniforms: {
        uTarget: { value: null }, uColor: { value: new Vector3() },
        uPoint: { value: new Vector2() }, uRadius: { value: SIM.SPLAT_RADIUS },
        uAspectRatio: { value: 1 },
      },
    })
    this.advectPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: ADVECT,
      uniforms: {
        uVelocity: { value: null }, uSource: { value: null },
        uTexelSize: { value: this.texel }, uDt: { value: SIM.DT },
        uDissipation: { value: 1 },
      },
    })
    this.divPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: DIVERGENCE,
      uniforms: { uVelocity: { value: null }, uTexelSize: { value: this.texel } },
    })
    this.jacobiPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: JACOBI,
      uniforms: {
        uPressure: { value: null }, uDivergence: { value: null },
        uTexelSize: { value: this.texel },
      },
    })
    this.gradPass = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: GRADIENT_SUBTRACT,
      uniforms: {
        uPressure: { value: null }, uVelocity: { value: null },
        uTexelSize: { value: this.texel },
      },
    })
  }

  resize(w, h) {
    this.w = w
    this.h = h
    this.texel.set(1 / w, 1 / h)
    this.velocity.dispose()
    this.dye.dispose()
    this.pressure.dispose()
    this.divergence.dispose()
    this.velocity = makeDouble(w, h, this.filter)
    this.dye = makeDouble(w, h, this.filter)
    this.pressure = makeDouble(w, h, this.filter)
    this.divergence = makeRT(w, h, this.filter)
  }

  splat(field, x, y, color, radius) {
    const u = this.splatPass.uniforms
    u.uTarget.value = field.read.texture
    u.uPoint.value.set(x, y)
    u.uColor.value.set(color[0], color[1], color[2])
    u.uRadius.value = radius
    u.uAspectRatio.value = this.w / this.h
    this.splatPass.render(field.write)
    field.swap()
  }

  advect(field, dissipation) {
    const u = this.advectPass.uniforms
    u.uVelocity.value = this.velocity.read.texture
    u.uSource.value = field.read.texture
    u.uDissipation.value = dissipation
    this.advectPass.render(field.write)
    field.swap()
  }

  step({ pointer, ambient, time, iters }) {
    // 1. external forces + dye
    if (pointer && pointer.down) {
      const fx = clamp(pointer.dx, SIM.FORCE_CLAMP) * SIM.CURSOR_FORCE
      const fy = clamp(pointer.dy, SIM.FORCE_CLAMP) * SIM.CURSOR_FORCE
      this.splat(this.velocity, pointer.x, pointer.y, [fx, fy, 0], SIM.SPLAT_RADIUS)
      const d = SIM.CURSOR_DENSITY
      this.splat(this.dye, pointer.x, pointer.y, [d, d, d], SIM.SPLAT_RADIUS)
    }
    if (ambient) {
      const d = SIM.AMBIENT_DENSITY
      for (const p of ambientSplats(time)) {
        this.splat(this.velocity, p.x, p.y, [p.dx * SIM.AMBIENT_FORCE, p.dy * SIM.AMBIENT_FORCE, 0], SIM.AMBIENT_RADIUS)
        this.splat(this.dye, p.x, p.y, [d, d, d], SIM.AMBIENT_RADIUS)
      }
    }

    // 2. divergence of current velocity
    this.divPass.uniforms.uVelocity.value = this.velocity.read.texture
    this.divPass.render(this.divergence)

    // 3. Jacobi pressure solve (warm-started from last frame's pressure)
    this.jacobiPass.uniforms.uDivergence.value = this.divergence.texture
    for (let i = 0; i < iters; i++) {
      this.jacobiPass.uniforms.uPressure.value = this.pressure.read.texture
      this.jacobiPass.render(this.pressure.write)
      this.pressure.swap()
    }

    // 4. subtract pressure gradient → divergence-free velocity
    this.gradPass.uniforms.uPressure.value = this.pressure.read.texture
    this.gradPass.uniforms.uVelocity.value = this.velocity.read.texture
    this.gradPass.render(this.velocity.write)
    this.velocity.swap()

    // 5. advect velocity, then dye
    this.advect(this.velocity, SIM.VEL_DISSIPATION)
    this.advect(this.dye, SIM.DYE_DISSIPATION)
  }

  dispose() {
    this.velocity.dispose()
    this.dye.dispose()
    this.pressure.dispose()
    this.divergence.dispose()
    this.splatPass.dispose()
    this.advectPass.dispose()
    this.divPass.dispose()
    this.jacobiPass.dispose()
    this.gradPass.dispose()
  }
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems.

- [ ] **Step 3: Commit**

```bash
git add src/components/gradient/three/Simulation.js
git commit -m "feat(gradient): Three.js stable-fluids Simulation"
```

---

## Task 8: `FluidScene.js` — renderer + composite

**Files:**
- Create: `src/components/gradient/three/FluidScene.js`

- [ ] **Step 1: Write the module**

```js
// src/components/gradient/three/FluidScene.js
// Owns the THREE.WebGLRenderer, the Simulation, and the composite pass that
// draws the final picture. `supported` is false when WebGL2 or float color
// buffers are unavailable — the caller then leaves the CSS cream fallback.
import { WebGLRenderer, LinearFilter, Vector3 } from 'three'
import { Simulation } from './Simulation'
import { ShaderPass } from './ShaderPass'
import { VERT, COMPOSITE } from './shaders'
import { SIM } from '../gradientConfig'

export class FluidScene {
  constructor(canvas) {
    this.supported = false
    this.renderer = null
    this.simRes = SIM.RES

    let renderer
    try {
      renderer = new WebGLRenderer({
        canvas, antialias: false, alpha: false, powerPreference: 'high-performance',
      })
    } catch (e) {
      console.error('[FluidScene]', e)
      return
    }
    if (!renderer.capabilities.isWebGL2) { renderer.dispose(); return }
    const floatRT = renderer.extensions.get('EXT_color_buffer_float')
      || renderer.extensions.get('EXT_color_buffer_half_float')
    if (!floatRT) { renderer.dispose(); return }

    this.renderer = renderer
    this.sim = new Simulation(renderer, LinearFilter) // half-float linear is core in WebGL2
    this.composite = new ShaderPass(renderer, {
      vertexShader: VERT, fragmentShader: COMPOSITE,
      uniforms: {
        uDye: { value: null }, uVelocity: { value: null },
        uBase0: { value: new Vector3() }, uBase1: { value: new Vector3() },
        uInk: { value: new Vector3() },
        uDyeIntensity: { value: SIM.DYE_INTENSITY },
        uDyeMax: { value: SIM.DYE_MAX },
        uRefraction: { value: SIM.REFRACTION },
      },
    })
    this.supported = true
  }

  setSimRes(res) { this.simRes = res }

  resize(w, h, dpr) {
    if (!this.supported) return
    this.renderer.setPixelRatio(dpr)
    this.renderer.setSize(w, h, false)
    const aspect = w / h
    const sh = this.simRes
    const sw = Math.max(2, Math.round(this.simRes * aspect))
    this.sim.resize(sw, sh)
  }

  _applyPalette(palette) {
    const u = this.composite.uniforms
    u.uDye.value = this.sim.dye.read.texture
    u.uVelocity.value = this.sim.velocity.read.texture
    u.uBase0.value.set(palette.base0[0], palette.base0[1], palette.base0[2])
    u.uBase1.value.set(palette.base1[0], palette.base1[1], palette.base1[2])
    u.uInk.value.set(palette.ink[0], palette.ink[1], palette.ink[2])
  }

  update({ pointer, ambient, time, iters, palette }) {
    if (!this.supported) return
    this.sim.step({ pointer, ambient, time, iters })
    this._applyPalette(palette)
    this.composite.render(null)
  }

  // Reduced-motion: one static frame, no sim step (dye is empty → base only).
  renderStatic(palette) {
    if (!this.supported) return
    this._applyPalette(palette)
    this.composite.render(null)
  }

  dispose() {
    if (!this.renderer) return
    this.sim.dispose()
    this.composite.dispose()
    this.renderer.dispose()
    this.renderer = null
    this.supported = false
  }
}
```

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems.

- [ ] **Step 3: Commit**

```bash
git add src/components/gradient/three/FluidScene.js
git commit -m "feat(gradient): FluidScene renderer + composite pass"
```

---

## Task 9: Rewrite `FluidGradient.jsx` to drive the Three.js scene (first integration)

**Files:**
- Modify: `src/components/gradient/FluidGradient.jsx` (full rewrite)

- [ ] **Step 1: Replace the file contents**

```jsx
/**
 * FluidGradient.jsx — Site-wide Three.js ink-fluid background.
 *
 * One fixed full-viewport WebGL canvas (z-index -1) behind all content. Each
 * frame it picks the section palette by viewport centre (crossfading toward the
 * next), steps the fluid (ambient drift always; cursor/touch adds force), and
 * composites base→ink by dye density. Mobile runs a smaller grid at ~30fps;
 * reduced-motion renders a single static frame; the loop pauses when hidden.
 * If WebGL2 / float targets are unavailable, the canvas stays empty and the CSS
 * body cream shows through.
 */
import { useEffect, useRef } from 'react'
import useMediaQuery from '../../hooks/useMediaQuery'
import { SECTIONS } from '../../config/sections'
import { FluidScene } from './three/FluidScene'
import { SECTION_PALETTES, GRADIENT, SIM } from './gradientConfig'
import { selectPalette } from './paletteSelect'

const ORDER = SECTIONS.map((s) => s.id)

export default function FluidGradient() {
  const canvasRef = useRef(null)
  const reduceMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const isMobile = useMediaQuery('(max-width: 767px)')

  useEffect(() => {
    const canvas = canvasRef.current
    const scene = new FluidScene(canvas)
    if (!scene.supported) { scene.dispose(); return } // CSS cream fallback
    scene.setSimRes(isMobile ? SIM.RES_MOBILE : SIM.RES)

    let w = 0
    let h = 0
    let rafId = null
    let lastDraw = 0
    const start = performance.now()
    const frameMs = isMobile ? GRADIENT.FRAME_MS_MOBILE : 0

    // pointer in uv (origin bottom-left) with per-frame delta
    const pointer = { x: -1, y: -1, dx: 0, dy: 0, down: false, lastMove: -9999 }

    const feed = (clientX, clientY) => {
      const nx = clientX / w
      const ny = (h - clientY) / h
      pointer.dx = pointer.x < 0 ? 0 : nx - pointer.x
      pointer.dy = pointer.y < 0 ? 0 : ny - pointer.y
      pointer.x = nx
      pointer.y = ny
      pointer.down = true
      pointer.lastMove = performance.now()
    }
    const onMove = (e) => feed(e.clientX, e.clientY)
    const onLeave = () => { pointer.down = false }
    // Passive touch listeners that never preventDefault — the ripple reacts but
    // the touch still scrolls / navigates normally.
    const onTouch = (e) => {
      const t = e.touches && e.touches[0]
      if (t) feed(t.clientX, t.clientY)
    }
    const onTouchEnd = () => { pointer.down = false }

    function resize() {
      const base = Math.min(window.devicePixelRatio || 1, 2)
      const dpr = isMobile ? base * GRADIENT.MOBILE_SCALE : base
      w = window.innerWidth
      h = window.innerHeight
      scene.resize(w, h, dpr)
    }

    function paletteNow() {
      const centerY = h / 2
      const rects = ORDER.map((id) => {
        const el = document.getElementById(id)
        if (!el) return null
        const r = el.getBoundingClientRect()
        return { top: r.top, bottom: r.bottom, height: r.height }
      })
      return selectPalette(rects, centerY, ORDER, SECTION_PALETTES, GRADIENT.SEAM_FADE)
    }

    function draw(now) {
      rafId = requestAnimationFrame(draw)
      if (frameMs && now - lastDraw < frameMs) return
      lastDraw = now
      // Lift the pointer shortly after motion stops (no new force injected).
      if (now - pointer.lastMove > 90) { pointer.dx = 0; pointer.dy = 0; pointer.down = false }
      scene.update({
        pointer,
        ambient: true,
        time: (now - start) / 1000,
        iters: isMobile ? SIM.JACOBI_MOBILE : SIM.JACOBI,
        palette: paletteNow(),
      })
    }

    resize()
    window.addEventListener('resize', resize)
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseleave', onLeave)
    window.addEventListener('touchstart', onTouch, { passive: true })
    window.addEventListener('touchmove', onTouch, { passive: true })
    window.addEventListener('touchend', onTouchEnd, { passive: true })

    if (reduceMotion) {
      scene.renderStatic(paletteNow()) // single static frame
    } else {
      rafId = requestAnimationFrame(draw)
    }

    const onVisibility = () => {
      if (document.hidden) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = null }
      } else if (!rafId && !reduceMotion) {
        rafId = requestAnimationFrame(draw)
      }
    }
    document.addEventListener('visibilitychange', onVisibility)

    return () => {
      if (rafId) cancelAnimationFrame(rafId)
      window.removeEventListener('resize', resize)
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseleave', onLeave)
      window.removeEventListener('touchstart', onTouch)
      window.removeEventListener('touchmove', onTouch)
      window.removeEventListener('touchend', onTouchEnd)
      document.removeEventListener('visibilitychange', onVisibility)
      scene.dispose()
    }
  }, [reduceMotion, isMobile])

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

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems in `FluidGradient.jsx` and the new gradient modules. (Hero/About/Projects/Gallery still import `useGradientSignal`; those are removed in Task 10. If lint fails *only* in those four files for unrelated reasons, proceed — they are addressed next. It must not fail in any gradient/three file.)

- [ ] **Step 3: Headless runtime check**

Restart the dev server (Vite stale-module gotcha after adding/renaming modules), then run:
`node scripts/console-check.mjs`
Expected: no `[error]` or `[uncaught]` lines (especially no GLSL compile errors), and `root innerHTML length:` > 0 (no white-screen).

- [ ] **Step 4: Visual smoke check**

Run: `node scripts/screenshot.mjs wip-fluid`
Open `scripts/shots/wip-fluid/` and confirm: a visible colored field per section (cobalt on Hero/About, cream on Projects, black-ish on Gallery/Contact) with ambient ink motion. (Cursor interaction can't be captured headlessly; verify it manually in the browser by moving the mouse.)

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/FluidGradient.jsx
git commit -m "feat(gradient): drive the background from the Three.js fluid scene"
```

---

## Task 10: Remove the scroll-signal system + dead files

**Files:**
- Modify: `src/components/Hero.jsx`, `src/components/About.jsx`, `src/components/Projects.jsx`, `src/components/Gallery.jsx`, `src/App.jsx`
- Delete: `src/context/GradientContext.js`, `src/context/GradientProvider.jsx`, `src/components/gradient/glRenderer.js`, `src/components/gradient/shaders.js` (old display shader — confirm it's the one with `uSeam`/`uFlood`/`uPulse`, distinct from the new `three/shaders.js`), `src/components/gradient/fluidSim.js`, `src/components/gradient/simShaders.js`, `scripts/probe-trail.mjs`

> The new `three/shaders.js` lives in `src/components/gradient/three/`; the file deleted here is the old `src/components/gradient/shaders.js`. Do not delete the new one.

- [ ] **Step 1: Remove the Hero hover signals**

In `src/components/Hero.jsx`:
- Remove the import line: `import { useGradientSignal } from '../context/GradientContext'`
- Remove the two MotionValues and registrations:
  ```jsx
  const heroHover = useMotionValue(-1)
  const heroHoverStrength = useMotionValue(0)
  useGradientSignal('heroHover', heroHover)
  useGradientSignal('heroHoverStrength', heroHoverStrength)
  ```
- Remove the effect that drives them (around lines 89–94: the `heroHover.set(...)` / `animate(heroHoverStrength, ...)` block and its surrounding `useEffect`).
- After editing, run `npm run lint` and remove any now-unused imports it flags (e.g., `useMotionValue`, `animate` — but only if they are no longer used elsewhere in the file).

- [ ] **Step 2: Remove the About 'seam' signal**

In `src/components/About.jsx`:
- Remove `import { useGradientSignal } from '../context/GradientContext'`
- Remove `useGradientSignal('seam', transitionProgress)` (around line 205).
- Remove the `transitionProgress` `useTransform(...)` derivation **only if** it is not referenced elsewhere in the file (search the file for `transitionProgress`). If it is used by visible animation, leave it.

- [ ] **Step 3: Remove the Projects 'flood' signal**

In `src/components/Projects.jsx`:
- Remove `import { useGradientSignal } from '../context/GradientContext'`
- Remove `useGradientSignal('flood', floodProgress)` (around line 86).
- Remove the `floodProgress` `useTransform(...)` derivation only if `floodProgress` is not referenced elsewhere (search the file).

- [ ] **Step 4: Remove the Gallery 'pulse' signal**

In `src/components/Gallery.jsx`:
- Remove `import { useGradientSignal } from '../context/GradientContext'`
- Remove `useGradientSignal('pulse', pulseProgress)` (around line 206).
- Remove the `pulseProgress` `useTransform(...)` derivation only if `pulseProgress` is not referenced elsewhere (search the file).

- [ ] **Step 5: Unwrap the provider in App.jsx**

In `src/App.jsx`:
- Remove `import { GradientProvider } from './context/GradientProvider'`
- Remove the `<GradientProvider>` opening/closing tags, keeping their children in place.

- [ ] **Step 6: Delete the dead modules**

```bash
git rm src/context/GradientContext.js src/context/GradientProvider.jsx \
  src/components/gradient/glRenderer.js src/components/gradient/shaders.js \
  src/components/gradient/fluidSim.js src/components/gradient/simShaders.js
rm -f scripts/probe-trail.mjs
```

- [ ] **Step 7: Verify no dangling references**

Run: `git grep -nE "useGradientSignal|useGradientSignals|GradientProvider|GradientContext|glRenderer|fluidSim|simShaders|heroHover|'seam'|'flood'|'pulse'" -- src` 
Expected: no matches in `src` except inside `src/components/gradient/three/` / config (which don't use these names). If anything remains, remove it.

- [ ] **Step 8: Lint + build + runtime**

Run: `npm run lint` → 0 problems.
Run: `npm run build` → succeeds.
Restart the dev server, then `node scripts/console-check.mjs` → no errors, root length > 0.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "refactor(gradient): remove scroll-signal system + dead WebGL1 fluid"
```

---

## Task 11: Mobile / reduced-motion / fallback verification

> No new code unless a check fails — this task confirms the budget paths added in Task 9 behave. If a check fails, fix it in `FluidGradient.jsx` / `FluidScene.js` and re-run.

**Files:**
- Modify (only if a check fails): `src/components/gradient/FluidGradient.jsx`, `src/components/gradient/three/FluidScene.js`

- [ ] **Step 1: Mobile capture**

Run: `node scripts/screenshot.mjs wip-mobile`
Open the mobile shots in `scripts/shots/wip-mobile/`. Expected: visible ambient ink on first load (no cursor), correct per-section colors, no layout shift vs `baseline`. Confirm the canvas renders at reduced resolution (it should still look smooth after CSS upscale).

- [ ] **Step 2: Reduced-motion check**

Temporarily emulate reduced motion (in `scripts/console-check.mjs` you can add, or verify manually in the browser via DevTools "Emulate prefers-reduced-motion"). Confirm: exactly one static frame renders (base gradient, no animation, no console errors). Revert any temporary edit to the script.

- [ ] **Step 3: Fallback check**

Confirm the `supported === false` path: in the browser, open a context where WebGL2 is blocked (or temporarily force `return` after the `isWebGL2` check via DevTools) and verify the page shows the cream `body` background with no crash. (Code already handles this; this is an observation step.)

- [ ] **Step 4: Visibility-pause check**

In the browser, switch tabs and back; confirm the RAF loop stops while hidden (no CPU/GPU churn) and resumes on return, with no console errors.

- [ ] **Step 5: Commit (only if fixes were made)**

```bash
git add -A
git commit -m "fix(gradient): mobile/reduced-motion/fallback budget adjustments"
```

---

## Task 12: Readability tuning pass

**Files:**
- Modify: `src/components/gradient/gradientConfig.js` (tuning constants only)

- [ ] **Step 1: Capture the candidate set**

Run: `node scripts/screenshot.mjs candidate`

- [ ] **Step 2: Diff against baseline for text contrast**

Open `scripts/shots/baseline/` and `scripts/shots/candidate/` side by side for all five sections at desktop/tablet/mobile. Check each section's heading/body text remains clearly readable over the ink.

- [ ] **Step 3: Tune if needed**

If any section's text is hard to read, adjust in `SIM` / `SECTION_PALETTES`:
- Lower `SIM.DYE_MAX` (e.g., 0.9 → 0.75) so ink never fully covers the base.
- Lower `SIM.DYE_INTENSITY` and/or `SIM.AMBIENT_DENSITY` to thin the ink.
- Raise/lower a section's `base` luminance (lighter base for dark text, darker for cream text).
Re-run `node scripts/screenshot.mjs candidate` and re-check until all five sections read clearly.

- [ ] **Step 4: Re-run the pure tests** (the config still satisfies its contract)

Run: `node --test test/`
Expected: PASS (all suites).

- [ ] **Step 5: Commit**

```bash
git add src/components/gradient/gradientConfig.js
git commit -m "fix(gradient): tune ink intensity/palette for text readability"
```

---

## Task 13: Update documentation

**Files:**
- Modify: `CLAUDE.md`, `docs/ARCHITECTURE.md`

- [ ] **Step 1: Update CLAUDE.md**

- Replace the "Fluid gradient background" core-pattern bullet so it describes the Three.js pipeline: one fixed full-viewport `THREE.WebGLRenderer` canvas (z-index −1) running a stable-fluids sim (`three/Simulation.js`) whose composite mixes a per-section `base` gradient toward an `ink` accent by dye density; ambient drift + cursor/touch force; per-section palette crossfade by viewport centre via `paletteSelect.js`. Renderer/passes: `three/FluidScene.js` + `three/ShaderPass.js` + `three/shaders.js`.
- In "Single sources of truth", keep the `gradientConfig.js` row but update its description to "per-section base/ink palettes + sim tuning".
- In "Gotchas": remove the bullet about global `seam`/`flood`/`pulse`/hover signals (those no longer exist). Keep/adjust the gotchas about: restarting the dev server after renaming modules; not calling `loseContext()` on a remounted canvas; reduced-motion single static frame; float render targets → unsupported falls back to CSS cream.
- Remove references to `glRenderer.js` / `simShaders.js` / `GradientContext`.

- [ ] **Step 2: Update docs/ARCHITECTURE.md**

Rewrite the gradient/fluid section to match: the Three.js module layout (`FluidScene → Simulation → ShaderPass`, `shaders.js`, `paletteSelect.js`, `ambient.js`, `colors.js`), the per-section base/ink palette + crossfade, ambient + cursor model, the half-float render-target requirement and fallback, and mobile/reduced-motion budget. Remove the seam/flood/pulse choreography tables and the hover-preview signal docs (those signals are gone). Note the sim runs on a square-ish grid scaled by aspect, independent of canvas resolution.

- [ ] **Step 3: Commit**

```bash
git add CLAUDE.md docs/ARCHITECTURE.md
git commit -m "docs: document the Three.js ink-fluid background pipeline"
```

---

## Task 14: Final verification

- [ ] **Step 1: Full test suite**

Run: `node --test test/`
Expected: PASS — colors, gradientConfig, paletteSelect, ambient.

- [ ] **Step 2: Lint**

Run: `npm run lint`
Expected: 0 problems.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds; note the bundle includes `three`.

- [ ] **Step 4: Headless runtime**

Restart the dev server, then `node scripts/console-check.mjs`
Expected: no `[error]`/`[uncaught]`; `root innerHTML length:` > 0.

- [ ] **Step 5: Final screenshots + manual confirmation**

Run: `node scripts/screenshot.mjs final`
Confirm across all five sections (desktop/tablet/mobile): visible bold ink in the section's palette, ambient motion on load, readable text. Manually in the browser: moving the cursor stirs stronger swirls that dissipate; touch on mobile reacts; reduced-motion shows a single static frame.

- [ ] **Step 6: Confirm clean tree**

Run: `git status`
Expected: clean (all work committed).

---

## Self-review notes (author)

- **Spec coverage:** Three.js pipeline (Tasks 6–9) ✔; per-section base/ink crossfade (Tasks 3,4,9) ✔; bold ink composite (Task 6) ✔; ambient drift + cursor (Tasks 5,7,9) ✔; global readability tuning (Tasks 3,12) ✔; mobile reduced budget + visibility pause (Tasks 9,11) ✔; reduced-motion static frame (Tasks 8,9,11) ✔; no-WebGL/float fallback (Tasks 8,11) ✔; remove seam/flood/pulse/hover + GradientContext (Task 10) ✔; remove dead WebGL1 files + probe-trail (Task 10) ✔; add `three` (Task 1) ✔; docs (Task 13) ✔; StrictMode-safe dispose without loseContext (Tasks 8,9) ✔.
- **Type consistency:** `selectPalette` returns `{base0,base1,ink}`; consumed identically in `FluidScene._applyPalette` and the composite uniforms `uBase0/uBase1/uInk`. `Simulation.step({pointer,ambient,time,iters})` matches `FluidScene.update` and `FluidGradient.draw`. `SIM`/`GRADIENT` keys used in code all exist in the Task 3 config and are asserted by `gradientConfig.test.mjs`. `ambientSplats(time)` shape `{x,y,dx,dy}` matches its use in `Simulation.step`.
- **Placeholder scan:** no TBD/TODO; deletion steps reference concrete symbols/line ranges from the current grep and are guarded by a `git grep` sweep + lint.
```
