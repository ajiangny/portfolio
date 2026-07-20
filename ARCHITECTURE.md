# Architecture & Maintenance Guide

Single-page portfolio: **React 19 + Vite**, **Tailwind v4** (CSS-first config in
`src/index.css`), **Framer Motion** for all animation, **Lenis** for smooth
scroll, **Three.js** for the WebGL fluid background. No router — the whole site
is five sections stacked in one scroll ([src/App.jsx](src/App.jsx)).

For the motion language (the ink-dissolve system used by every reveal), see
[README.md](README.md) — that stays the reference for `useInkFilter` /
`InkDissolve` tuning.

```
Hero → About → Projects → Gallery → Contact
```

---

## 1. App shell & global systems

Everything global is mounted once in `App.jsx`:

| System | Files | What it does |
| --- | --- | --- |
| Smooth scroll | `hooks/useLenis.js`, `context/LenisContext.js` | One Lenis instance driven by rAF; a context ref (`useLenisContext()`) lets sections read `lenis.scroll`, listen to scroll events, `scrollTo()`, and `stop()/start()` (lightbox). Reduced motion keeps Lenis (sections depend on its events) but disables smoothing. |
| Section registry | `config/sections.js` | **Single source of truth** for section ids, nav labels, theme colours, and landing offsets. Header + Contact both navigate through `goToSection()`. |
| Page transition | `context/TransitionProvider.jsx`, `context/TransitionContext.js`, `components/PageTransition.jsx` | `navigate(href, opts, color)` raises a fixed veil (backdrop blur + section-tinted ink dissolve, 600 ms), performs an instant Lenis jump under cover, then dissolves away. A ref lock prevents re-entry mid-transition. |
| Global nav | `components/SiteHeader.jsx` | Morphing glass pill: full bar on Hero, collapses to a monogram + scroll-progress ring after, re-expands on hover; mobile gets a dropdown. Light/dark text derives from the **gradient's** top base colour (`SECTION_PALETTES`), not `themeRgb`. Hovering a link previews that section's palette in the background (via `gradient/hoverSignal.js`, only while Hero is centred). |
| Fluid background | `components/gradient/*` | One fixed WebGL2 canvas at `z-index:-1` behind the whole site (details below). |
| Custom cursor | `components/Cursor.jsx` | Fine-pointer only. Blend-difference dot; scales on interactive elements; swaps to a cream label pill over `[data-cursor-label]`; `[data-cursor-hint]` shows a one-time "Click me!" teaching hint. |
| Active section | `hooks/useActiveSection.js` | Which section holds the viewport centre + hysteresis "settled" flag — drives the header morph, mirrors the gradient's palette math. |

### The fluid gradient (`components/gradient/`)

- `FluidGradient.jsx` — React shell: canvas, pointer/touch feed, palette
  selection per frame, mobile downscaling (~30 fps, half-res), prewarm on load,
  static frame under reduced motion, pause when tab hidden. Falls back to the
  CSS cream body if WebGL2/float buffers are missing.
- `three/FluidScene.js` — renderer + composite pass (base gradient → ink by dye
  density, refraction, film grain).
- `three/Simulation.js` — stable-fluids solve (splat → divergence → Jacobi →
  gradient subtract → advect) on half-float ping-pong targets.
- `three/ShaderPass.js` / `three/shaders.js` — fullscreen-quad plumbing + GLSL.
- `gradientConfig.js` — **all tuning lives here**: `SECTION_PALETTES`
  (per-section `base` 2-stop gradient, `ink` accent, `energy` stir level), `SIM`
  (resolution, forces, dissipation), `GRADIENT` (seam fade, grain).
- `paletteSelect.js` / `colors.js` / `ambient.js` — pure helpers (palette
  crossfade by viewport centre, colour lerp, Lissajous drift points). These have
  unit tests in `test/*.test.mjs` (`node test/<file>` to run).

### Z-index map

| Layer | z |
| --- | --- |
| Fluid gradient canvas | -1 |
| Section content | 0–5 |
| Projects/About sticky content | normal flow |
| Gallery fixed stage | 50 |
| SiteHeader | 200 |
| Gallery lightbox | 200 (mounts after header, sibling stacking) |
| PageTransition veil, Cursor | 9999 |

---

## 2. Design system (src/index.css)

Tailwind v4 — tokens are declared in the `@theme` block and become both
utilities (`text-cream`, `font-display`, `text-label`…) and CSS vars
(`var(--text-body)`) for inline style objects.

**Type scale** (single source of truth, `--text-*`):
`hero` (fluid, wordmark only) · `section` (fluid display) · `title` · `body`
(fluid 12→14 px) · `label` (11 px, tracked uppercase) · `meta` (10 px).

**Fonts**: `--font-display` Nevera (self-hosted, preloaded in index.html) ·
`--font-sans` DM Sans · `--font-mono` IBM Plex Mono · `--font-heading`
Instrument Sans. Google Fonts loads the latter three (+ Abril Fatface as the
display fallback).

**Colours**: cream (#FFF), cobalt family (#1B3A8C…), ink. Sections are mostly
transparent — the gradient IS the background colour system.

**The glass material** — the one surface recipe the whole UI shares (bento
tiles `.ab-tile`, navbar pill, project cards, mobile menu):

```css
border: 1px solid rgba(255,255,255,0.18);
background: rgba(18,22,46,0.40);
border-radius: 22px;
backdrop-filter: blur(16px);
box-shadow: 0 8px 30px rgba(8,12,40,0.18);
```

Hover (pointer devices): corners sharpen to 0, background darkens
(`.ab-tile-hover`). If you add a new card anywhere, reuse these values.

**Component CSS sections** in index.css, in order: font + tokens → Lenis →
body/selection/cursor → About bento grid (`.about-bento`, `.ab-*`) → icon
buttons (`.icon-btn`) → Spotify equalizer → focus-visible + reduced-motion →
Gallery stage/pieces/lightbox (`.gallery-*`).

**Accessibility baseline** (keep when editing): `:focus-visible` outlines
(cream on dark sections), `prefers-reduced-motion` kills animations globally
and every component has an explicit reduced path, `inert` on the bento until
assembled, sr-only Gallery heading, aria labels on all icon-only controls,
`MotionConfig reducedMotion="user"` in App.

---

## 3. Sections

### Hero (`Hero.jsx`, `hero/HeroWordmark.jsx`)
100vh, transparent. "PORTFOLIO 2026" eyebrow (one-shot InkReveal) + the
"ANDREW JIANG" wordmark: an inlined SVG (one `<path>` per letter, exported from
the design file — no font dependency) with per-glyph mouse repulsion in SVG
user space and an ink-dissolve entrance. The same component is reused in
Contact. To change the wordmark you must re-export the letter paths into
`LETTERS` (viewBox 1440×151).

### About (`About.jsx` + `about/*`) — the big one
A **700vh** container whose first 600vh drive `progress` 0→1 via a Lenis
listener; a sticky 100vh child renders everything. Phases:

1. **0→0.15** Gallery wall: white panel + `GridMontage` (art grid, profile
   dead-centre; per-ring size/opacity/tilt, per-card ink reveal on viewport
   entry).
2. **0.15→0.32** Outer cards ink-dissolve away ring by ring; the white panel
   fades (flat fill → honest opacity fade).
3. **0.30→0.48** Portrait flight: an overlay `<img>` takes over the centre
   cell's exact rect and morphs (real box, not transform scale) to the measured
   bento profile-tile rect, shell (radius/border/shadow) interpolating
   cell-look → tile-look.
4. **0.50→0.66** `AboutBento` tiles assemble (staggered scrubbed ink dissolves,
   `Assemble` wrapper, starts 0.50/0.52/…/0.60).

Bento tiles: tagline + resume + **DogPet** (sprite-sheet pixel dog, compositor
`steps()` animation, click to pet) · profile (flight landing site) ·
**TechMosaic** (packed icon grid; click a small cell to promote it to 2×2) ·
**TypewriterBio** · **StatusTicker** (rotating status) · **SpotifyCard**
(real queue player: tracklist from `/api/playlist`, per-song covers from
`/api/track`, hidden Spotify iframe controller, ink-dissolve cover swaps) ·
socials. Layout is pure CSS grid (`.about-bento` in index.css) with
desktop / portrait-tablet / mobile template variants; on mobile the
taller-than-viewport grid pans vertically with leftover scroll.

### Projects (`Projects.jsx`, `projects/ProjectCard.jsx`)
Normal-flow section (no pinning). "Selected Projects" heading + one glass card
per entry of `works` (`data/projectsData.js`), each wrapped in an `InkReveal`.
Card: 12-col grid — sticky info column (title/subtitle/year/role/stack badges/
CTA link) + parallax image (120%-tall, drifts −10%). Optional `hoverThumbnail`
crossfades through the ink filter on hover.

### Gallery (`Gallery.jsx`, `gallery/GalleryLightbox.jsx`, `data/galleryData.js`)
"Drifting print-desk": a **240vh** scroll-pinned section whose visible stage is
a **fixed** full-viewport layer (z-50) that fades/dissolves in over the seam
from Projects and out toward Contact. Pieces are absolutely placed from
`DESKTOP_SPOTS` / `MOBILE_SPOTS`, sized by tier (S/M/L) at their true aspect
ratio, and have three nested transforms: scroll entry/exit → drag (constrained
to the stage) → ambient drift (deterministic per-piece Lissajous, paused on
hover/drag). Pointer-down raises a piece; tapping the front-most piece opens
the lightbox (Lenis stops while open). Mobile: the stage widens to 200vw inside
a native horizontal scroller. The last spot is the "View All" card (flips to
"Coming Soon").

### Contact (`Contact.jsx`)
Min-100vh, transparent. Mail / tagline / socials row (InkReveals) above the
reused `HeroWordmark`, with a second `DogPet` that drops in from the top of the
viewport (`spawnDrop`). Socials come from `SOCIALS` in aboutData — one edit
updates the bento tile and the footer.

### API (`api/`, Vercel functions)
`/api/playlist` harvests the public Spotify embed's `__NEXT_DATA__` (no auth) →
name, cover, ordered tracklist. `/api/track?id=` uses Client Credentials
(`SPOTIFY_CLIENT_ID/SECRET` in `.env`) for per-song covers. In dev,
`vite.config.js` serves these in-process so plain `npm run dev` works; both
degrade gracefully (card falls back to static `SPOTIFY` data).

---

## 4. How to update things (recipes)

### Add / edit a project
1. Drop a thumbnail in `public/thumbnail/` — `.webp`, **≤1152px wide** (2× the
   576×420 display frame; the frame crops to `aspect-576/420`, image renders
   120% tall for parallax). Downscale with
   `node scripts/optimize-art.mjs convert public/thumbnail/<in> public/thumbnail/<out>.webp 1152`.
   `hoverThumbnail` (e.g. a gif) only downloads on first hover, so it can be
   heavier — but keep it sane.
2. Add an object to `works` in [src/data/projectsData.js](src/data/projectsData.js):
   `title`, `subtitle`, `tech: []`, `year`, `role`, `github`/`live` (CTA shows
   "Launch Website" if `live`, else "View Code" if `github`), `thumbnail`,
   optional `hoverThumbnail` (e.g. a gif) for the hover crossfade.
3. Stack badges: if a `tech` label has no entry in `TECH_ICON_MAP`
   ([ProjectCard.jsx](src/components/projects/ProjectCard.jsx)), it renders as a
   2-letter chip. To give it an icon, add the svg to `public/icons/default/`
   and map the label → filename there.
4. Order in the array = order on the page. Keep the GitHub CTA card last.

### Add artwork to the Gallery
1. Export as `.webp` into `public/art/`, **downscaled** — oversized sources lag
   the About/Gallery transitions (decode + composite cost scales with source
   pixels, and everything renders over the live WebGL gradient). Targets
   (longest edge): gallery artworks 1600px · About-wall-only art 800px ·
   `profile.webp` 1400px. Use
   `node scripts/optimize-art.mjs convert public/art/<f> public/art/<f> 1600 0.82`
   (untracked script, puppeteer-based; `probe` lists every file's dims + KB).
2. Add an entry to `artworks` in [src/data/galleryData.js](src/data/galleryData.js)
   with a unique `id`, `medium` label (shown on hover + lightbox), `src`, and
   the file's **real** `w`/`h` (pieces and the lightbox use this aspect ratio).
3. There must be one scatter spot per artwork **plus one** trailing spot for
   the View All card: if you now have more artworks than spots, append a
   `{ x, y, t }` entry to **both** `DESKTOP_SPOTS` and `MOBILE_SPOTS` in
   [Gallery.jsx](src/components/Gallery.jsx) (x/y are % of the stage, `t` is
   the size tier S/M/L). The View All card always takes the last spot.
4. Artwork order in `artworks` = spot order, and the lightbox browses in that
   order.

The About gallery wall is separate: it shows `GRID_IMAGES` (desktop 5×3) /
`GRID_IMAGES_MOBILE` (3×3) from `aboutData.js` — swap paths there, keep
`profile.webp` at the `GRID_PROFILE_INDEX` position (the flight depends on it).

### About bento content
All text/data in [src/data/aboutData.js](src/data/aboutData.js):
`TAGLINE_SEGMENTS` (per-word weight/italic/break), `BIO_PARAGRAPHS`
(typewriter), `RESUME_URL` (file at `public/docs/resume.pdf`), `STATUS_ITEMS`,
`SOCIALS`, `SPOTIFY` (playlist id + fallbacks). `TECH_STACK`: `id` doubles as
the icon filename in `public/icons/white/` + `public/icons/default/` (white =
rest, colour = hover; `noWhite: true` if only a colour svg exists). **Order
matters** — the four `big: true` anchors at positions 1/4/6/9 tile the 4×6
desktop grid hole-free; re-check visually if you reorder.

### Add a whole section
1. Create the component, render it in `App.jsx`, give the root element an
   `id`.
2. Register it in `SECTIONS` ([src/config/sections.js](src/config/sections.js))
   with label, `themeRgb` (veil tint), and `scrollOffsetVh` if navigation
   should land past its top.
3. Add a palette entry in
   [gradientConfig.js](src/components/gradient/gradientConfig.js) —
   `SECTION_PALETTES` keys must cover every section id (header light/dark logic
   and the background both read it).

### Tune the background
Everything is in `gradientConfig.js`: section colours (`SECTION_PALETTES`),
liveliness (`energy` per section, `SIM.AMBIENT_FORCE`), calmness/perf
(`SIM.RES*`, `JACOBI*`), grain (`GRADIENT.GRAIN`). Drift paths are in
`ambient.js`. After palette changes run `node test/gradientConfig.test.mjs`
(it sanity-checks luminance/contrast assumptions).

---

## 5. Dev workflow

```bash
npm run dev      # Vite + in-process /api/* (needs .env for Spotify covers)
npm run lint     # ESLint (react-hooks rules on)
npm run build    # production build
node test/<f>    # gradient unit tests (ambient/colors/gradientConfig/paletteSelect)
```

Deploys on Vercel: static build + `api/` functions; set `SPOTIFY_CLIENT_ID` /
`SPOTIFY_CLIENT_SECRET` in the dashboard.

Known trade-offs (deliberate): one ~950 kB JS bundle (three + framer-motion,
no code-splitting — fine for a single-page site, split `three` first if it ever
matters); SVG ink filters rasterize on CPU (see README perf note); the Spotify
playlist harvest reads an undocumented embed payload and degrades gracefully.
