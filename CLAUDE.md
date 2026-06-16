# Andrew Jiang — Portfolio

Single-page scroll-choreographed portfolio. React 19 + Vite + Tailwind v4 +
Framer Motion (motion values) + Lenis smooth scroll. No router, no backend.
Five sections stacked in [src/App.jsx](src/App.jsx):
Hero → About → Projects → Gallery → Contact.

**Detailed scroll choreography tables, the fluid gradient guide, and
change recipes live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — read it
before retiming animations or touching the gradient.**

## Commands

- `npm run dev` — dev server (default port 5173)
- `npm run lint` — ESLint; keep this at 0 problems
- `npm run build` / `npm run preview`
- `node scripts/screenshot.mjs <setName> [url]` — captures every section at
  desktop/tablet/mobile into `scripts/shots/<setName>/` (dev server must be
  running). Launches headless Chrome with software WebGL so the gradient
  background actually renders. Capture a `baseline` set before visual changes
  and diff after.
- `node scripts/console-check.mjs [url]` — headless load (software WebGL on);
  prints console errors and the rendered root size. Use it to detect a
  white-screen crash or a shader compile/runtime error.

## Single sources of truth (edit these, not call sites)

| What | Where |
|---|---|
| Section ids, labels, nav colors, blob shapes, landing offsets | [src/config/sections.js](src/config/sections.js) |
| Per-section base/ink palettes + sim tuning (SIM) + shell tuning (GRADIENT) | [src/components/gradient/gradientConfig.js](src/components/gradient/gradientConfig.js) |
| Project cards + tech-icon mapping | [src/data/projectsData.js](src/data/projectsData.js) |
| Gallery artworks | [src/data/galleryData.js](src/data/galleryData.js) |
| About filmstrip images + skills lists | [src/data/aboutData.js](src/data/aboutData.js) |
| Design tokens (colors, fonts, **type scale** `--text-*`) | `@theme` in [src/index.css](src/index.css) |
| Contact email + social links | [src/components/Contact.jsx](src/components/Contact.jsx) |

## Core patterns

- **Scroll progress**: sections are tall containers (400–700vh) with a sticky
  100vh child; a 0→1 MotionValue drives everything via `useTransform` windows.
  Projects/Gallery use [useScrollTimeline](src/hooks/useScrollTimeline.js)
  (pass travel in vh); About has a bespoke Lenis listener. Cross-section seams
  use Framer's `useScroll`.
- **Lenis listener pattern**: subscribe inside a `setTimeout(0)`, store the
  unsubscribe in an `unlisten` var, clean up both. Never return the cleanup
  from inside the timeout callback (it gets discarded).
- **Fluid gradient background**: one fixed full-viewport canvas
  ([FluidGradient](src/components/gradient/FluidGradient.jsx), z-index −1)
  renders a Three.js ink-fluid simulation behind everything — it *is* the page
  background, so every section is background-transparent (`body` keeps cream as
  the no-WebGL fallback). Pipeline: `FluidGradient.jsx` (React shell; RAF loop;
  pointer/touch listeners; palette selection via `paletteSelect.js`) →
  `three/FluidScene.js` (owns `THREE.WebGLRenderer`, the `Simulation`, and the
  composite pass; `supported=false` when WebGL2 or float color buffers are
  unavailable) → `three/Simulation.js` (stable-fluids velocity + dye on
  half-float ping-pong render targets; per step: inject force/dye → divergence
  → Jacobi pressure solve → subtract gradient → advect velocity → advect dye)
  → `three/ShaderPass.js` (generic fullscreen-quad pass) + `three/shaders.js`
  (VERT, SPLAT, ADVECT, DIVERGENCE, JACOBI, GRADIENT_SUBTRACT, COMPOSITE
  shaders). The COMPOSITE pass mixes a per-section vertical base gradient
  (base0 top → base1 bottom) toward an ink accent by clamped dye density;
  velocity adds subtle refraction. Palette crossfade is driven purely by which
  section holds the viewport centre (past `SEAM_FADE`) via `paletteSelect.js`.
  Ambient drift (`ambient.js`) keeps the field alive on load and on mobile with
  no cursor; cursor/touch injects stronger swirls. The sim grid is
  aspect-scaled (`SIM.RES` short side) and independent of canvas resolution.
- **Navigation**: every nav UI calls `goToSection()` from config/sections.js,
  which runs the blob curtain (TransitionProvider: 600ms expand → instant
  Lenis jump → shrink).
- **Styling**: Tailwind utilities for static layout; inline `style` objects
  for anything driven by motion values or `isMobile`. Match whichever the
  surrounding code uses.
- **Responsive**: single JS breakpoint `useMediaQuery('(max-width: 767px)')`;
  mobile swaps layouts (vertical carousel, skills marquee, top-centre
  portrait), not just sizes. The gradient renders at a reduced buffer
  (`MOBILE_SCALE`), uses a smaller sim grid (`SIM.RES_MOBILE`) and fewer
  Jacobi iterations, and throttles to ~30fps (`FRAME_MS_MOBILE`). Ambient drift
  still runs on mobile (no cursor); touch injects swirls. Falls back to the CSS
  cream body color where WebGL2 or float color buffers are unavailable.

## Gotchas

- After renaming/deleting modules, restart the dev server — Vite's stale
  module graph can 404 and white-screen the app while HMR claims success.
  (This also silently desyncs the running gradient from edited config/shaders.)
- z-index registry: PageTransition 9999 › SectionNav portal 120/130 ›
  Gallery fixed header 50 › Projects expanding overlay 40 › content (auto) ›
  FluidGradient canvas −1 (behind all). Stay inside these bands.
- The fluid sim (`three/Simulation.js`) and the composite pass (`three/ShaderPass.js`)
  are separate Three.js passes, each with their own render targets. `FluidScene`
  reports `supported=false` when WebGL2 or float color buffers
  (`EXT_color_buffer_float` / `EXT_color_buffer_half_float`) are unavailable;
  `FluidGradient` then leaves the CSS body cream fallback in place and skips
  the RAF loop.
- Canvas/RAF loops read motion values through refs each frame — never capture
  them in effect closures with `[]` deps.
- StrictMode double-mounts effects; every listener/RAF must clean up. Do NOT
  call `WEBGL_lose_context.loseContext()` on a canvas you remount — the
  remount gets the same dead context (see `FluidScene.dispose`).
- `prefers-reduced-motion` is honored globally (MotionConfig + CSS); the
  gradient renders a single static frame under it. Keep new animations inside
  those mechanisms.
- Known tradeoff: on ~768px portrait the Gallery's 9×3 mosaic is full-bleed
  and crops the outer columns (incl. the View All cell). Intentional for now.
