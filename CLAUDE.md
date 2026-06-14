# Andrew Jiang — Portfolio

Single-page scroll-choreographed portfolio. React 19 + Vite + Tailwind v4 +
Framer Motion (motion values) + Lenis smooth scroll. No router, no backend.
Five sections stacked in [src/App.jsx](src/App.jsx):
Hero → About → Projects → Gallery → Contact.

**Detailed scroll choreography tables, the halftone engine guide, and
change recipes live in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — read it
before retiming animations or touching a canvas.**

## Commands

- `npm run dev` — dev server (default port 5173)
- `npm run lint` — ESLint; keep this at 0 problems
- `npm run build` / `npm run preview`
- `node scripts/screenshot.mjs <setName> [url]` — captures every section at
  desktop/tablet/mobile into `scripts/shots/<setName>/` (dev server must be
  running). Capture a `baseline` set before visual changes and diff after.
- `node scripts/console-check.mjs [url]` — headless load; prints console
  errors and the rendered root size. Use it to detect a white-screen crash.

## Single sources of truth (edit these, not call sites)

| What | Where |
|---|---|
| Section ids, labels, nav colors, blob shapes, landing offsets | [src/config/sections.js](src/config/sections.js) |
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
- **Halftone canvases**: one engine
  ([HalftoneCanvas](src/components/halftone/HalftoneCanvas.jsx)) + per-section
  draw strategies; sections use the thin presets (ProfileHalftone,
  ProjectsHalftone, GalleryHalftone). Hero's HalftoneBg is intentionally
  separate. All share GRID=18 and container-offset alignment so the dot
  lattice is seamless across sections.
- **Navigation**: every nav UI calls `goToSection()` from config/sections.js,
  which runs the blob curtain (TransitionProvider: 600ms expand → instant
  Lenis jump → shrink).
- **Styling**: Tailwind utilities for static layout; inline `style` objects
  for anything driven by motion values or `isMobile`. Match whichever the
  surrounding code uses.
- **Responsive**: single JS breakpoint `useMediaQuery('(max-width: 767px)')`;
  mobile swaps layouts (vertical carousel, skills marquee, top-centre
  portrait), not just sizes.

## Gotchas

- After renaming/deleting modules, restart the dev server — Vite's stale
  module graph can 404 and white-screen the app while HMR claims success.
- z-index registry: PageTransition 9999 › SectionNav portal 120/130 ›
  Gallery fixed header 50 › Projects expanding overlay 40.
  Stay inside these bands.
- Canvas draw loops read motion values through refs each frame — never
  capture them in effect closures with `[]` deps.
- StrictMode double-mounts effects; every listener/RAF must clean up.
- `prefers-reduced-motion` is honored globally (MotionConfig + CSS); keep new
  animations inside those mechanisms.
- Known tradeoff: on ~768px portrait the Gallery's 9×3 mosaic is full-bleed
  and crops the outer columns (incl. the View All cell). Intentional for now.
