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
| 0→0.3 / 0→0.35 | name tag fades / flies up −110px |
| 0→0.4 | orbit bubbles fade out; radius multiplier 1+scroll×3.5 (explode) |
| 0→1 | cobalt shifts 27,58,140 → 37,79,193 (writes `--color-cobalt*` CSS vars) |

Hover (scroll ≤ 0.05): hovering/tapping a bubble retints the whole hero to
that section's `themeRgb` from `config/sections.js` (`updateColor`).
Bubble geometry: `OrbitBubble.jsx` — desktop (≥768) is an elliptical orbit
around the wordmark; mobile (<768) **flanks the wordmark** with the four
blobs (About/Projects above, Gallery/Contact below, with a tiny drift) so
they never cross the cobalt "Portfolio" letters. Both paths share the
scroll-explode (`outward = 1+scroll×3.5`) and opacity fade. Orbit speed in
`hero/orbitConstants.js` (ORBIT_DURATION).

### About (`About.jsx`) — the long one

Two clocks:
- `introProgress` — Hero→About handoff; starts 0.8vh **before** the section
  pins, spans 1.25vh of scroll.
- `progress` — main clock over the 600vh sticky travel.

| Clock | Window | Effect |
|---|---|---|
| intro | 0→0.7 | distant blank strips fall through (fade 0→0.06, out 0.62→0.7) |
| intro | 0.31→0.72 | filmstrip columns rise from below |
| intro | 0.31→0.78 | frames scale 0.6→1 |
| progress | 0.1125→0.28125 | columns scroll (left −55%, right −62%, centre stops with profile card dead-centre — measured, not hard-coded) |
| progress | 0.255→0.3075 | profile card crossfades duotone→full colour |
| progress | 0.2925→0.35 | side columns part (x ±140%) |
| progress | 0.31 | expanding overlay takes over the photo (filmstrip card hides 0.31→0.318; centre column splits up/down 0.31→0.37) |
| progress | 0.31→0.37 | photo stage A: glides to large centred portrait |
| progress | 0.37→0.45 | photo holds centre-stage |
| progress | 0.45→0.52 | photo stage B: glides to resting spot (desktop: right panel at 63vw; mobile: top-centre, 78vw wide at y=104px) |
| progress | 0.504→0.5725 | text cascade (in `AboutTextPanel.jsx`): heading 0.514, bio 0.523, second bio 0.53, skills 0.537, resume 0.544; SectionNav label 0.505→0.545 |
| progress | 0.5725→0.85 | rest — fully revealed state (nav lands here: offset 3.6vh ≈ progress 0.6) |
| progress | 0.85→1.0 | fade-out: content fades via a bottom-up CSS mask, revealing the gradient as it crossfades cobalt→cream into Projects |

About is a **cobalt** section (background-transparent; the gradient's cobalt
`about` palette shows through), so its cream text/filmstrip stay legible. The
photo expansion is rect-driven: it reads the filmstrip
card's `getBoundingClientRect` and lerps between start/centre/final rects in
a `useMotionValueEvent` — retime by editing the 0.31 / 0.37 / 0.45 / 0.52
breakpoints there (and the text windows in `AboutTextPanel.jsx` to follow).

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

WhileInView staggered entrance; SectionNav label via `useScroll`
`['start end','start 0.4']`. Background-transparent, so the site-wide gradient
(dark `contact` palette) continues seamlessly from Gallery — no per-section
canvas. Form submit = `mailto:` handoff (no backend); footer nav maps over
`SECTIONS`.

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
time)`, `renderStatic(palette)`, `resize()`, `dispose()`, and `supported`.
Reports `supported=false` when WebGL2 or float color buffers
(`EXT_color_buffer_float` / `EXT_color_buffer_half_float`) are unavailable;
`FluidGradient` then leaves the CSS cream fallback and skips the RAF loop.

**`three/Simulation.js`** — stable-fluids velocity + dye sim on **half-float**
ping-pong render targets. The sim grid is a square-ish grid scaled by aspect
(`SIM.RES` short side), independent of canvas resolution. Per step: inject
force/dye (cursor + ambient splats) → divergence → Jacobi pressure solve →
subtract pressure gradient (divergence-free) → advect velocity → advect dye.

**`three/ShaderPass.js`** — generic fullscreen-quad pass (`RawShaderMaterial`,
GLSL ES 1.00; vertex writes clip space directly). Reused for every sim step and
the composite pass.

**`three/shaders.js`** — GLSL strings: `VERT`, `SPLAT`, `ADVECT`, `DIVERGENCE`,
`JACOBI`, `GRADIENT_SUBTRACT`, `COMPOSITE`. The COMPOSITE shader mixes a
per-section vertical **base** gradient (base0 top → base1 bottom) toward an
**ink** accent color by clamped dye density; velocity adds subtle refraction.

**`gradientConfig.js`** — single source of truth for:
- `PALETTES` — per-section `{ base: [top, bottom], ink }` colors. Palettes
  mirror each section's tone: Hero + About **cobalt** (dark; cream text),
  Projects **cream** (light; dark text), Gallery + Contact **near-black**.
- `SIM` — sim tuning: `RES`, `RES_MOBILE`, `JACOBI_STEPS`, `JACOBI_STEPS_MOBILE`,
  `DYE_MAX`, `DISSIPATION`, force and ambient parameters.
- `GRADIENT` — shell tuning: `SEAM_FADE`, `MOBILE_SCALE`, `FRAME_MS_MOBILE`.

**`paletteSelect.js`** — pure `selectPalette(sections, scrollY, winH, palettes,
SEAM_FADE)`: finds the section whose centre is nearest the viewport centre;
once the next section's share passes `SEAM_FADE`, begins crossfading into its
palette. No MotionValues, no context — called directly from the RAF loop.

**`ambient.js`** — pure `ambientSplats(time)`: returns a list of slow
Lissajous-path splat points so the fluid is always alive (on load + on mobile
where there is no cursor). Strength is low enough not to obscure text.

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
| Fluid feel (force, dissipation) | `SIM.*` in `gradientConfig.js` |
| Crossfade seam width | `GRADIENT.SEAM_FADE` in `gradientConfig.js` |
| Mobile resolution/fps | `SIM.RES_MOBILE`, `GRADIENT.MOBILE_SCALE`, `GRADIENT.FRAME_MS_MOBILE` |
| Composite look (ink blend) | `COMPOSITE` shader in `three/shaders.js` |
| Ambient drift paths | `ambient.js` |

## 4. Navigation & transitions

`config/sections.js` is the single source of truth (id, label, themeRgb,
blobShape, scrollOffsetVh) with `goToSection(navigate, id, e)` used by all
three nav UIs (Hero bubbles, SectionNav blob menu, Contact footer).

`TransitionProvider` phases: blob expands from the click point (600ms,
covers screen) → instant Lenis jump → 50ms settle → blob shrinks (600ms)
→ unlock. The blob itself is `PageTransition.jsx` (z-9999, organic
border-radius shapes from `hero/orbitConstants.js`).

`SectionNav.jsx` renders its expanded state through a portal to `<body>`
(sticky sections create stacking contexts it must escape). Desktop opens on
hover (suppressed within 250ms of scrolling); mobile opens on tap as a
vertical dropdown. Colours adapt to the section background (`isDarkBg` /
`isBlackBg` lists in the component).

## 5. Responsive strategy

- One JS breakpoint: `(max-width: 767px)` via `useMediaQuery`.
- Mobile is a different layout, not a scaled-down one: vertical snap
  carousel (Projects), skills marquee instead of a wrapped grid, top-centre
  portrait with text below (About), 3×5 gallery grid, hero nav blobs
  flanking the wordmark.
- `useScrollTimeline` re-reads `window.innerHeight` per tick and on resize,
  so orientation changes / URL-bar collapses can't skew progress;
  `useInfiniteCarousel` re-centres on breakpoint flips; About re-measures
  the filmstrip centre on resize.
- About's filmstrip uses `lite` mode on mobile (grayscale + colour blend)
  because the SVG duotone filter re-rasterises every frame and janks.
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
| `text-eyebrow` | 12px | prominent eyebrow (Hero name tag) |
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
- **Edit bio/skills/filmstrip**: `aboutData.js` (data),
  `AboutTextPanel.jsx` (copy/layout).
- **Change contact email/socials**: constants at the top of `Contact.jsx`.
- **Verify visually**: `npm run dev`, then
  `node scripts/screenshot.mjs baseline` before and
  `node scripts/screenshot.mjs after` following the change; compare
  `scripts/shots/*`. `console-check.mjs` catches white-screen crashes.
