# Three.js Ink-Fluid Background — Design

**Date:** 2026-06-16
**Branch:** `feat/hero-fluid-gradient`
**Status:** Approved (design), pending spec review

## Problem

The site-wide background is a hand-rolled WebGL1 stable-fluids sim
(`src/components/gradient/fluidSim.js`) whose output is rendered as a *subtle
displacement + faint dye* on top of a cobalt mesh-gradient. The fluid is hard
to see: on desktop it only steps for ~`SETTLE_MS` after the mouse moves, it is
deliberately low-intensity, and it silently degrades to "no fluid" whenever the
GPU cannot render or linear-filter float textures. The user perceives this as
broken ("I don't see any fluid animation").

The user wants to replace it with the bold, visible liquid from the
[mofu-dev "Stable Fluids with three.js"](https://mofu-dev.com/en/blog/stable-fluids)
article and its reference repo
[mnmxmx/fluid-three](https://github.com/mnmxmx/fluid-three), implemented on
**Three.js**. The reference is the same stable-fluids math but renders the fluid
as the *primary* visual: a near-still field where the cursor drags swirling
colored liquid that dissipates (`color.frag` maps velocity → RGB).

## Goals

- Replace the custom WebGL1 renderer with a Three.js stable-fluids pipeline that
  produces a **bold, visible liquid** as the site background.
- Keep the site's **per-section color identity**: the liquid's palette
  crossfades between sections as you scroll (Hero → About → Projects → Gallery →
  Contact), driven by whichever section holds the viewport centre.
- The liquid reads as **colored ink/dye** — swirling streaks of each section's
  accent color, not a subtle gradient warp.
- The field is **alive without interaction** (ambient drift) and reacts more
  strongly to the cursor; on mobile it drifts at a reduced budget and reacts to
  touch.
- **Text stays readable** in all five sections via globally-tuned intensity (no
  per-text panels/scrims).
- Preserve existing platform behavior: mobile budget, reduced-motion static
  frame, graceful no-WebGL fallback, StrictMode-safe cleanup.

## Non-goals

- The scroll-choreography gradient signals (`seam`, `flood`, `pulse`) and the
  Hero nav-hover preview (`heroHover`, `heroHoverStrength`) are **removed**. Each
  section's own DOM choreography (expanding overlays, blob curtain, pulse rings)
  is independent and stays; only the *gradient's reaction* to those moments goes
  away.
- No per-section readability panels/scrims (explicitly declined).
- No React Three Fiber, no `EffectComposer`, no off-the-shelf fluid library.
- No new gallery page or tablet-crop work (tracked separately).

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Scope vs existing system | Three.js fluid is the **whole background**; keep per-section palette crossfade; **drop** seam/flood/pulse + hover signals. |
| Idle behavior | **Ambient drift + cursor** — slow always-moving liquid base, cursor stirs stronger swirls. |
| Liquid look | **Colored ink / dye** — swirling accent-color streaks over a calmer base. |
| Readability | **Tune intensity globally** — bounded dye/opacity + stable base luminance, no panels. |
| Mobile | **Ambient at reduced budget** — half-res / lower fps, auto-pause when tab or background not visible; touch-reactive. |
| Implementation | **Raw Three.js GPGPU** (ping-pong `WebGLRenderTarget`s + minimal `ShaderPass`); add `three` as the only new dependency. |

## Architecture

The React shell is preserved; the renderer underneath is swapped from the custom
`glRenderer` to Three.js.

### File layout

```
src/components/gradient/
  FluidGradient.jsx     ← rewritten: React wrapper + per-frame orchestration
  gradientConfig.js     ← reworked: per-section base+ink colors, new SIM tuning
  three/
    FluidScene.js       ← owns THREE.WebGLRenderer; wires passes;
                          update(dt, pointer, palette) / resize / dispose
    Simulation.js       ← fluid steps: force → advect → divergence →
                          pressure (Jacobi) → gradient subtract → dye advect/inject
    ShaderPass.js       ← generic fullscreen-quad pass (RawShaderMaterial + target)
    shaders.js          ← GLSL strings: advect, divergence, jacobi,
                          gradientSubtract, splat, composite
```

### Removed files / code

- `src/components/gradient/glRenderer.js` (custom WebGL1 renderer)
- `src/components/gradient/shaders.js` (old display shader) — replaced by
  `three/shaders.js`
- `src/components/gradient/fluidSim.js` (custom WebGL1 sim) — replaced by
  `three/Simulation.js`
- `src/components/gradient/simShaders.js` — folded into `three/shaders.js`
- `src/context/GradientContext.js` + `src/context/GradientProvider.jsx`
  (only used for the dropped signals; the palette crossfade reads DOM rects, not
  the context) and the `<GradientProvider>` wrapper in `src/App.jsx`
- `scripts/probe-trail.mjs` (untracked probe scratch file) — remove if no longer
  needed.

### Component boundaries

- **`ShaderPass`** — *what:* renders one fullscreen-quad fragment program into a
  target (or to screen). *Use:* `new ShaderPass(renderer, { fragment, uniforms })`,
  then `pass.render(targetOrNull)`. *Depends on:* the shared
  `THREE.WebGLRenderer`, a shared fullscreen-triangle geometry, and a single
  `THREE.OrthographicCamera`/scene. No knowledge of the fluid.
- **`Simulation`** — *what:* owns the fluid render targets (velocity, dye,
  pressure, divergence — ping-pong where needed) and runs the per-step passes.
  *Use:* `sim.step({ pointer, ambient, dt, inkColor })`; expose
  `sim.velocityTexture` / `sim.dyeTexture`; `sim.resize(w,h)`; `sim.dispose()`.
  *Depends on:* `ShaderPass`, `shaders.js`, `SIM` config.
- **`FluidScene`** — *what:* creates/owns the `THREE.WebGLRenderer`, the
  `Simulation`, and the composite pass that draws the final picture to the
  canvas. *Use:* `scene.update(dt, pointer, palette)`, `scene.resize(w,h,dpr)`,
  `scene.dispose()`, `scene.supported`. *Depends on:* `Simulation`, `ShaderPass`,
  `shaders.js`.
- **`FluidGradient.jsx`** — *what:* React lifecycle + the RAF loop; picks the
  active section + crossfade from DOM rects; gathers pointer/touch state and
  ambient timing; applies the mobile/reduced-motion/visibility budget; calls
  `scene.update`. *Depends on:* `FluidScene`, `gradientConfig`, `SECTIONS`,
  `useMediaQuery`.

## Simulation detail

Stable-fluids on **half-float** render targets (`THREE.HalfFloatType`). Fields:

- `velocity` (ping-pong) — RG = velocity vector.
- `pressure` (ping-pong) — R = pressure scalar.
- `divergence` (single) — R = divergence scalar.
- `dye` (ping-pong) — RGB = ink density/color (the visible liquid).

Per `step` (matching the reference and the current `fluidSim.js`):

1. **External force** — additive Gaussian splat into `velocity` from the cursor
   delta and from ambient splat points; same step adds a dye splat in `inkColor`.
2. **Advect velocity** — semi-Lagrangian backtrace, multiply by velocity
   dissipation.
3. **Divergence** of the advected velocity.
4. **Pressure (Jacobi)** — N iterations (`JACOBI_DESKTOP` / `JACOBI_MOBILE`),
   ping-ponging `pressure`, using `divergence`.
5. **Gradient subtract** — make velocity divergence-free.
6. **Advect dye** by the corrected velocity, multiply by dye dissipation.

Tuning constants live in `gradientConfig.js` `SIM` (resolution, Jacobi iters,
dt, dissipations, splat radius, force, force clamp, dye intensity). Half-float
filtering: prefer `LinearFilter`; the reference look tolerates `NearestFilter`
if linear half-float filtering is unavailable.

## Color & per-section palette

`gradientConfig.js` `SECTION_PALETTES` is reworked so each section provides:

- `base` — the resting field color (kept in a comfortable luminance for the
  section's text: light for cream-text-on-dark sections, etc.).
- `ink` — the accent injected by cursor + ambient.

`FluidGradient` keeps the existing viewport-centre logic to choose the active
section index and a crossfade factor toward the next section once progress passes
`SEAM_FADE`, then passes interpolated `base` and `ink` into `scene.update`.

**Composite pass** (`composite` fragment):

```
density = clamp(dyeDensity * DYE_INTENSITY, 0.0, DYE_MAX)
color   = mix(base, ink, density)
```

So the dye *is* the visible liquid, tinted per section. Velocity may add a small
optional refraction of the base for organic motion, bounded low so it cannot
speckle.

## Ambient drift + cursor

- **Ambient:** a small number (2–3) of slow splat points whose positions follow
  low-frequency curl-noise / Lissajous paths, injecting low-strength force + dye
  every frame. Keeps the field alive on first load and on mobile with no input.
- **Cursor/touch:** pointer delta → stronger force splat + dye splat at the
  pointer. Reuses the existing normalized-pointer-with-delta plumbing from
  `FluidGradient.jsx` (mouse + passive touch listeners that never
  `preventDefault`, so scrolling/navigation is unaffected).

## Readability

Globally tuned, no panels:

- Cap dye contribution (`DYE_MAX`) and `DYE_INTENSITY` so ink reads as rich
  texture, not opaque foreground.
- Keep each section's `base` luminance in a range that preserves contrast with
  that section's text.
- **Verification:** capture `node scripts/screenshot.mjs baseline` before the
  change; after, capture a new set and diff all five sections at
  desktop/tablet/mobile, confirming text contrast.

## Platforms & fallbacks

- **Mobile** (`useMediaQuery('(max-width: 767px)')`): half-resolution sim grid,
  fewer Jacobi iters, throttled fps; ambient on but the RAF auto-pauses on
  `visibilitychange` and when no section holds the viewport centre.
- **Reduced motion** (`prefers-reduced-motion: reduce`): ambient off; render one
  static composed frame (current behavior).
- **No WebGL2 / no float render target:** `FluidScene.supported === false` → the
  canvas stays empty and the CSS `body` cream shows through (current fallback).
  Three.js is WebGL2-only; half-float color buffers are broadly supported, so
  this path is rare.
- **StrictMode / cleanup:** dispose the renderer, all render targets, materials,
  and geometry on unmount. Do **not** call `WEBGL_lose_context.loseContext()` on
  a canvas that remounts (existing gotcha — the remount inherits the dead
  context).

## Dependency

Add `three` (latest) — the only new runtime dependency (~150 KB gzip). Import
only the classes used (`WebGLRenderer`, `WebGLRenderTarget`, `RawShaderMaterial`,
`Mesh`, `BufferGeometry`, `OrthographicCamera`, `Scene`, math/types) so bundlers
tree-shake the rest.

## Section components touched (signal removal)

- `src/components/Hero.jsx` — remove `heroHover` / `heroHoverStrength`
  MotionValues, their `useGradientSignal` registrations, and the `animate`/effect
  that drives them (lines ~42–94).
- `src/components/About.jsx` — remove `useGradientSignal('seam', …)` and the
  now-unused `transitionProgress` derivation if used only for the signal.
- `src/components/Projects.jsx` — remove `useGradientSignal('flood', …)` and the
  now-unused `floodProgress`.
- `src/components/Gallery.jsx` — remove `useGradientSignal('pulse', …)` and the
  now-unused `pulseProgress` if used only for the signal.
- `src/App.jsx` — remove `GradientProvider` import + wrapper.

In each, confirm the underlying scroll `progress`/`useTransform` is not reused by
other visible animation before deleting it; remove only the signal-only
derivations.

## Docs

Update `CLAUDE.md` and `docs/ARCHITECTURE.md`: describe the Three.js pipeline
(FluidScene → Simulation → ShaderPass), the per-section base/ink palette, ambient
drift, and remove references to seam/flood/pulse/hover and the old
`glRenderer`/`simShaders` modules and `GradientContext`.

## Testing & verification

- `npm run lint` → 0 problems.
- `npm run build` succeeds.
- `node scripts/console-check.mjs` → no shader compile/runtime errors, root size
  non-zero (no white-screen).
- `node scripts/screenshot.mjs` baseline-vs-after diff across all five sections
  at desktop/tablet/mobile; confirm visible liquid + readable text.
- Manual: cursor stirs liquid on desktop; ambient visible on load; mobile shows
  ambient + touch reaction; reduced-motion shows a single static frame.

## Risks

- **Readability vs boldness** — bold ink can hurt contrast; mitigated by global
  caps + screenshot verification. May need per-section `base`/`DYE_MAX` tuning.
- **Bundle size** — `three` adds weight; acceptable per the explicit Three.js
  requirement, minimized by selective imports.
- **Half-float filtering support** — fall back to `NearestFilter`; if no float RT
  at all, fall back to CSS cream.
- **Mobile battery** — continuous ambient costs power; mitigated by reduced
  budget + aggressive visibility pausing.
