# Portfolio Architecture & Choreography Reference

This is the detailed companion to the root `CLAUDE.md`. It documents how the
scroll experience is built so future changes ("make the About photo settle
earlier", "add a project", "slow down the Projects exit") can be made
surgically. Line numbers drift — search for the quoted progress values.

## 1. Page anatomy

One page, five sections, no router. Lenis owns scrolling; Framer Motion
values own animation. Approximate document map in viewport-heights (vh):

| Section | File | Container | Pinned | Progress source |
|---|---|---|---|---|
| Hero | `src/components/Hero.jsx` | 100vh | no | Framer `useScroll` (own exit) |
| About | `src/components/About.jsx` | 700vh | sticky 600vh + 100vh run-out | bespoke Lenis listener: `(scroll − offsetTop) / 6vh` |
| Projects | `src/components/Projects.jsx` | 400vh | sticky 300vh | `useScrollTimeline(ref, 3)` |
| Gallery | `src/components/Gallery.jsx` | 340vh | sticky 240vh (fixed overlay) | `useScrollTimeline(ref, 2.4)` + approach clock |
| Contact | `src/components/Contact.jsx` | natural | no | Framer `useScroll` |

Wrappers in `App.jsx`: `LenisContext` (scroll instance ref),
`TransitionProvider` (blob navigation), `MotionConfig reducedMotion="user"`.

Hooks: `useLenis` (creates Lenis + RAF loop), `useScrollTimeline(ref, vh)`
(section progress, resize-aware), `useMediaQuery` (breakpoint),
`useInfiniteCarousel` (Projects runway logic).

## 2. Section choreography tables

All numbers are **section progress** (0→1) unless marked otherwise.

### Hero (`Hero.jsx`)

Progress = how far the Hero has scrolled out (`['start start','end start']`).

| Window | Effect |
|---|---|
| 0→0.45 | heading opacity 1→0 |
| 0→0.55 | heading scale 1→1.18, y 0→−70 |
| 0→1 | cobalt shifts 27,58,140 → 37,79,193 (writes `--color-cobalt*` CSS vars) |

Hero renders a single flat-white "ANDREW JIANG" wordmark (`ElasticHeading`,
per-letter mouse-repulsion retained) pinned to the bottom edge and sized to
bleed full-width past both side margins. It rises slightly and fades on
scroll-out. Background-transparent; the fluid gradient shows through.
`hero/orbitConstants.js` is kept (trimmed to `BLOB_SHAPES` only) because
`PageTransition.jsx` still uses it for the curtain silhouette.

### About (`About.jsx`) — the long one

One clock: `progress`, over the 600vh sticky travel (bespoke Lenis listener).
The journey (gallery wall → portrait fly-in) **resolves into a bento grid**
(`about/AboutBento.jsx`) — the travelling portrait lands as the bento's profile
tile and the other six tiles assemble around it.

| Window | Effect |
|---|---|
| 0→0.30 | gallery wall settled (`about/GridMontage.jsx`; white panel opaque; profile photo dead-centre) |
| 0.15→0.32 | outer cells dissolve ring-by-ring toward the centre (GridMontage) |
| 0.30→0.42 | white panel fades out → fluid gradient shows through |
| 0.30→0.315 | centre cell hides; the overlay portrait (flight vehicle) takes over (same image) |
| 0.30→0.48 | overlay moves DIRECTLY to the **measured bento profile-tile rect** (`finalBox`) — single eased move, no centre expand/hold |
| (desktop) | the overlay simply settles as the profile card and stays (no crossfade — it carries the same glass material as the tiles) |
| 0.48→0.51 | (mobile only) overlay fades out as the in-grid profile photo fades in, so the photo pans with the bento |
| 0.50→0.66 | six tiles assemble, staggered ~0.02 apart (tagline .50, tech .52, about .54, status .56, spotify .58, social .60; each ~0.06 long; opacity + rise + scale) — `AboutBento.jsx` |
| 0.52→0.88 | **mobile only**: the tall bento pans vertically (`panY`) so every tile is reachable; overflow measured from the grid |
| 0.66→0.85 | settled bento (nav lands here: offset 4.5vh ≈ progress 0.75) |
| 0.85→1.0 | fade-out: content fades via a bottom-up CSS mask, revealing the gradient as it crossfades cobalt→cream into Projects |

About is a **cobalt** section (background-transparent; the gradient's cobalt
`about` palette shows through), so its cream text/photo stay legible. The bento
grid is as wide as the expanded navbar and uses the **same glass material as
`SiteHeader`**. The photo handoff is rect-driven: `About.jsx` reads the
GridMontage centre cell's `getBoundingClientRect` (start) and the AboutBento
profile tile's rect (final, in sticky-relative = pinned-viewport coords) and
lerps start→final in a `useMotionValueEvent`. Retime by editing the 0.30 / 0.48
move window in `About.jsx` and the per-tile `start` values + the
`profileOpacity` / `panY` windows in `AboutBento.jsx`.

### About→Projects seam

The 100vh of native scroll where About unpins and Projects slides in. The
per-section palette crossfades cobalt→cream as Projects' viewport share passes
`SEAM_FADE` in `paletteSelect.js`. Scroll-position-driven, so it holds if the
user pauses mid-seam.

### Projects (`Projects.jsx`)

| Window | Effect |
|---|---|
| 0→0.06 | section label in (out 0.55→0.63) |
| 0.08→0.16 | carousel rises in |
| 0.13→0.20 | bottom progress pill in (out 0.55→0.63) |
| 0.20→0.50 | interactive browse |
| 0.50→0.55 | tech icons fade |
| 0.55→0.63 | active card blacks out; content/border fade; grayscale (0.55→0.60), brightness→0 (0.60→0.63), tilt flattens |
| 0.63→0.67 | secondary cards fade |
| 0.63→0.65 | expanding overlay appears (synced to active card's rect; sync RAF runs 0.57–0.85) |
| 0.65→0.92 | overlay scale 0.5→5 (→0.82) →150 (→0.92); radius 16→0 (→0.73); carousel pointer-events locked > 0.65 |

Carousel: works ×3 runway; `useInfiniteCarousel` keeps the user in the middle
set with silent jumps, handles click-to-centre (desktop spring on scrollLeft,
mobile native smooth + scroll-snap), and re-centres when the 768px breakpoint
flips. Card visuals (tilt, wash, GitHub CTA card) in
`projects/ProjectCard.jsx`; shared exit transforms are built once in
Projects.jsx as `cardTransforms`.

### Gallery (`Gallery.jsx`)

Content lives in a `position:fixed` z-50 overlay (so it can sit above the
Projects expanding overlay); the section itself is a transparent sticky frame
(the gradient's dark `gallery` palette shows through).

Clocks: `gapProgress` — approach, from 1.45vh before the section top to the
top; `progress` — 240vh sticky travel.

| Clock | Window | Effect |
|---|---|---|
| gap | 0→0.05 | header layer fades in (visibility-gated) |
| gap (reveal = gap 0.35→1 → 0→1) | per cell: in at `0.55 + (i/cells)·0.30`, +0.14 long | staggered cell reveal |
| progress | per cell: out at `0.80 + (i/cells)·0.11`, +0.08 long | staggered exit |
| progress | 0.82→1.0 | header fades toward Contact |

Grid: desktop 27 cells (9×3), art at positions `[1,4,7,9,12,15,18,20,23]`,
View All at 26; mobile 15 cells (3×5), art at `[0,2,4,6,7,8,10,12,13]`,
View All at 14. Cell styles in `index.css` (`.gallery-*`). Lightbox in
`gallery/GalleryLightbox.jsx`; Lenis is stopped while it's open.

### Contact (`Contact.jsx`)

WhileInView staggered entrance. Background-transparent, so the site-wide
gradient (dark `contact` palette) continues seamlessly from Gallery — no
per-section canvas. Form submit = `mailto:` handoff (no backend); footer nav
maps over `SECTIONS`.

## 3. Fluid gradient background (`src/components/gradient/`)

One fixed full-viewport canvas behind all content (`position:fixed`, z-index −1)
renders a **Three.js ink-fluid simulation**. It is the page background and every
section is background-transparent (`body` keeps `--color-cream` as the no-WebGL
fallback). Because it is one continuous surface, cross-section continuity is
free — no lattice-alignment math.

### Module layout

```
FluidGradient.jsx          ← React shell
  └─ three/FluidScene.js   ← THREE.WebGLRenderer + Simulation + composite
       ├─ three/Simulation.js   ← stable-fluids velocity + dye (half-float ping-pong)
       ├─ three/ShaderPass.js   ← generic fullscreen-quad pass
       └─ three/shaders.js      ← GLSL strings (VERT, SPLAT, ADVECT, DIVERGENCE,
                                   JACOBI, GRADIENT_SUBTRACT, COMPOSITE)
gradientConfig.js          ← per-section palettes + SIM tuning + GRADIENT shell tuning
colors.js                  ← pure rgb() + lerp3()
paletteSelect.js           ← pure selectPalette() (active section by viewport centre + crossfade)
ambient.js                 ← pure ambientSplats(time) (slow Lissajous drift)
```

**`FluidGradient.jsx`** — React lifecycle shell. Mounts the `<canvas>` at
z-index −1, owns the RAF loop (~30fps desktop, `FRAME_MS_MOBILE` on mobile),
wires pointer/touch listeners, calls `paletteSelect.js` each frame to pick the
active section palette by viewport centre, applies mobile/reduced-motion/
visibility budget, and delegates to `FluidScene`.

**`three/FluidScene.js`** — owns the `THREE.WebGLRenderer`, a `Simulation`
instance, and the COMPOSITE `ShaderPass`. Exposes `update(palette, pointer,
time)`, `prewarm({steps,iters,palette})`, `renderStatic(palette)`, `resize()`,
`dispose()`, and `supported`. `prewarm` runs the sim forward N steps (no
compositing) before the first painted frame so the field loads as an already-
developed liquid instead of isolated blobs that slowly build. Reports
`supported=false` when WebGL2 or float color buffers (`EXT_color_buffer_float`
/ `EXT_color_buffer_half_float`) are unavailable; `FluidGradient` then leaves
the CSS cream fallback and skips the RAF loop.

**`three/Simulation.js`** — stable-fluids velocity + dye sim on **half-float**
ping-pong render targets. The sim grid is a square-ish grid scaled by aspect
(`SIM.RES` short side), independent of canvas resolution. Per step: inject
force/dye (cursor + ambient splats) → divergence → Jacobi pressure solve →
subtract pressure gradient (divergence-free) → advect velocity → advect dye.

**`three/ShaderPass.js`** — generic fullscreen-quad pass (`RawShaderMaterial`,
GLSL ES 1.00; vertex writes clip space directly). Reused for every sim step and
the composite pass.

**`three/shaders.js`** — GLSL strings: `VERT`, `SPLAT`, `ADVECT`, `DIVERGENCE`,
`JACOBI`, `GRADIENT_SUBTRACT`, `COMPOSITE`. The COMPOSITE shader builds the
final picture from a per-section vertical **base** gradient (base0 top → base1
bottom) plus the dye, in three layers: (1) a **coloured body** that blends the
base toward the section **ink** by a curved, capped dye density — injected
fluid reads as saturated colour (cyan pools on Hero), not a pale overlay; (2)
**caustic veins** — a bright ridge wherever the dye field *folds* (steep
gradient), so highlights are thin veins of light, not broad blobs; (3) a
**cursor crest** where dye peaks. The bright colour is the section's own ink
brightened toward white, so light sections keep their hue instead of flashing
white. Velocity adds subtle refraction.

**`gradientConfig.js`** — single source of truth for:
- `PALETTES` — per-section `{ base: [top, bottom], ink, energy }`. Colours
  mirror each section's tone: Hero **deep cobalt→cerulean** with a vivid cyan
  ink (cream text), About **cobalt**, Projects **cream** (dark text), Gallery +
  Contact **near-black**. `energy` (0..1) scales that section's ambient stir
  (and, gently, its emitted dye): Hero churns hard so its dye folds into the
  deep-water/caustic look; the others stay calm so content reads cleanly. It
  crossfades across seams like the colours.
- `SIM` — sim tuning: `RES`, `RES_MOBILE`, `JACOBI`, `JACOBI_MOBILE`,
  `DYE_MAX`, dissipation, force and ambient parameters (`AMBIENT_FORCE` is the
  Hero-level stir, scaled per-section by `energy`).
- `GRADIENT` — shell tuning: `SEAM_FADE`, `MOBILE_SCALE`, `FRAME_MS_MOBILE`.

**`paletteSelect.js`** — pure `selectPalette(sections, scrollY, winH, palettes,
SEAM_FADE)`: finds the section whose centre is nearest the viewport centre;
once the next section's share passes `SEAM_FADE`, begins crossfading into its
palette. No MotionValues, no context — called directly from the RAF loop.

**`ambient.js`** — pure `ambientSplats(time)`: returns several slow
Lissajous-path splat points (each orbiting its own centre, biased to the
upper/middle of the field) so the fluid is always alive (on load + on mobile
where there is no cursor) and their overlapping, advecting dye folds into a
continuous liquid rather than a few discrete blobs. The per-section `energy`
keeps the stir from obscuring text outside Hero.

### Palette crossfade

Palette selection and crossfade are computed every frame in `paletteSelect.js`
from `window.scrollY` alone — no MotionValues, no signal registry. The COMPOSITE
shader receives `uPalA` (current base/ink) and `uPalB` (next base/ink) plus
`uMix` (0→1 crossfade weight).

### Cursor / touch model

On desktop: pointer move events feed a position + velocity into `Simulation`
as a force/dye splat. On mobile: touch events feed the same path. `DYE_MAX`
globally clamps dye density to keep text readable. Ambient drift (`ambient.js`)
runs regardless of input so the field is never frozen.

### Mobile + reduced-motion budget

| Setting | Value |
|---|---|
| Render buffer | `MOBILE_SCALE` × full resolution |
| Sim grid | `SIM.RES_MOBILE` (shorter side) |
| Jacobi iterations | `SIM.JACOBI_STEPS_MOBILE` |
| RAF throttle | `FRAME_MS_MOBILE` (~30fps) |
| Reduced-motion | `renderStatic()` — one static COMPOSITE frame, ambient off |
| Visibility hidden | RAF paused via `visibilitychange` |

### Tuning cheat-sheet

| Goal | Where to edit |
|---|---|
| Section resting colors | `PALETTES[sectionId].base` / `.ink` in `gradientConfig.js` |
| How lively a section's fluid is | `PALETTES[sectionId].energy` in `gradientConfig.js` |
| Fluid feel (force, dissipation) | `SIM.*` in `gradientConfig.js` |
| Crossfade seam width | `GRADIENT.SEAM_FADE` in `gradientConfig.js` |
| Mobile resolution/fps | `SIM.RES_MOBILE`, `GRADIENT.MOBILE_SCALE`, `GRADIENT.FRAME_MS_MOBILE` |
| Composite look (ink blend) | `COMPOSITE` shader in `three/shaders.js` |
| Ambient drift paths | `ambient.js` |

## 4. Navigation & transitions

`config/sections.js` is the single source of truth (id, label, themeRgb,
blobShape, scrollOffsetVh) with `goToSection(navigate, id, e)` used by the
global `SiteHeader` and the Contact footer.

**`SiteHeader.jsx`** — one global fixed header (`z-index: 200`, rendered once
in `App.jsx`). It morphs based on scroll: an expanded glass bar (AJ monogram
left + four links right) while a section is settled, collapsing to a monogram
pill while crossing a seam, re-expanding when the next section is centred. The
collapse/expand is a Framer Motion spring on the pill width. The morph is
driven by `src/hooks/useActiveSection.js`, which subscribes to Lenis and uses
viewport-centre math matching `paletteSelect.js` (BAND_ENTER/BAND_EXIT
hysteresis) — so the header collapses roughly in sync with the gradient palette
crossfade at seams. Glass + text colours adapt per section from each section's
`themeRgb` (light backgrounds → dark text/glass; dark backgrounds → cream
text/glass). The active link is highlighted; hovering a link previews that
section's palette in the fluid gradient (FluidGradient self-gates to Hero).
On mobile (≤767px) the header stays a monogram pill with a frosted dropdown.

**z-index registry**: PageTransition 9999 › SiteHeader 200 › Gallery fixed
header 50 › Projects expanding overlay 40 › content (auto) › FluidGradient
canvas −1 (behind all).

`TransitionProvider` phases: blob expands from the click point (600ms,
covers screen) → instant Lenis jump → 50ms settle → blob shrinks (600ms)
→ unlock. The blob itself is `PageTransition.jsx` (z-9999, organic
border-radius shapes from `hero/orbitConstants.js`).

## 5. Responsive strategy

- One JS breakpoint: `(max-width: 767px)` via `useMediaQuery`.
- Mobile is a different layout, not a scaled-down one: vertical snap
  carousel (Projects), a tall scroll-panned About bento (single-column stack
  vs. the desktop 3-column grid), 3×3 gallery wall on the About entry, 3×5
  gallery grid, monogram-pill header with frosted dropdown (SiteHeader).
- `useScrollTimeline` re-reads `window.innerHeight` per tick and on resize,
  so orientation changes / URL-bar collapses can't skew progress;
  `useInfiniteCarousel` re-centres on breakpoint flips; About re-measures the
  bento profile-tile rect (and the mobile bento overflow) on resize.
- Known tradeoff: ~768px portrait crops the Gallery mosaic's outer columns
  (incl. View All). Revisit if tablet traffic matters.

### Type scale (single source of truth)

All text sizes come from `--text-*` tokens in the `@theme` block of
`src/index.css`. Tailwind v4 turns each into a `text-*` utility **and** a CSS
var, so both class names (`text-label`) and inline style objects
(`fontSize: 'var(--text-hero)'`, used for motion-/`isMobile`-driven sizing)
read the same source. Tiers:

| Token | Size | Use |
|---|---|---|
| `text-hero` | `clamp(3rem,13vw,13rem)` | Hero wordmark only |
| `text-section` | `clamp(2.25rem,7.5vw,6rem)` | About + Contact display headings |
| `text-title` | `clamp(1.125rem,2vw,1.5rem)` | card / modal titles |
| `text-body` | `clamp(.75rem,2.6vw,.875rem)` | paragraphs (fluid 12→14px) |
| `text-eyebrow` | 12px | prominent eyebrow labels |
| `text-label` | 11px | nav / field / section labels |
| `text-meta` | 10px | counters, footer fine print |

`letter-spacing`/`font-weight` stay at the call site; only size + line-height
move to tokens. Interactive button text and a few specialised chips
(`SkillIcon`, the Gallery View-All CSS clamp) keep bespoke sizes.

## 6. Recipes

- **Add a project**: append to `works` in `src/data/projectsData.js`
  (thumbnail in `public/thumbnail/`, 16:9). New tech label? Add it to
  `TECH_ICON_MAP` (icon names from the `tech-stack-icons` package).
  Keep the GitHub CTA card last.
- **Add gallery artwork**: drop a webp in `public/art/`, append to
  `src/data/galleryData.js`. More than 9 artworks needs new position
  entries in `Gallery.jsx` (`DESKTOP_ART_POSITIONS` / `MOBILE_ART_POSITIONS`).
- **Change a section's nav colour / blob shape / landing spot**: one line in
  `config/sections.js`.
- **Retime an animation**: find its window in the tables above; edit the
  `useTransform(progress, [in], [out])` ranges in that section's file.
- **Make a section longer/shorter**: change the container height (vh) and
  the matching travel — `useScrollTimeline(ref, vh)` arg (Projects/Gallery)
  or `vh * 6` in About's listener. Keep travel = container − 100vh.
- **Edit bio / tagline / tech+hobbies / status / spotify / socials**:
  `aboutData.js` (data); `about/AboutBento.jsx` (tile layout/assembly),
  `about/StatusTicker.jsx`, `about/SpotifyCard.jsx`. Gallery-wall images are
  also in `aboutData.js` (`GRID_*`), rendered by `about/GridMontage.jsx`.
- **Change contact email/socials**: constants at the top of `Contact.jsx`.
- **Verify visually**: `npm run dev`, then
  `node scripts/screenshot.mjs baseline` before and
  `node scripts/screenshot.mjs after` following the change; compare
  `scripts/shots/*`. `console-check.mjs` catches white-screen crashes.
