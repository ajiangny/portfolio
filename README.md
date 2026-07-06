# Portfolio

Personal portfolio — a single-page scroll experience built with **React 19 +
Vite**, **Tailwind v4**, **Framer Motion**, **Lenis** smooth scroll, and a
**Three.js** WebGL fluid-gradient background.

Five sections in one scroll: `Hero → About → Projects → Gallery → Contact`.

**→ [ARCHITECTURE.md](ARCHITECTURE.md)** — full system map, design tokens, and
how-to-update recipes (add a project, add gallery artwork, edit bento content,
add a section, tune the background). This file covers setup and the motion
system.

## Getting started

```bash
npm install
npm run dev      # Vite dev server + in-process /api/* functions
npm run lint     # ESLint
npm run build    # production build
node test/<f>    # gradient unit tests (test/*.test.mjs)
```

The About section's Spotify player needs a `.env` with `SPOTIFY_CLIENT_ID` and
`SPOTIFY_CLIENT_SECRET` for per-song cover art (everything else degrades
gracefully without it). Deploys on Vercel: static build + `api/` serverless
functions, with the same two env vars set in the dashboard.

## Motion: the ink dissolve system

Every reveal on the site uses one effect: an **ink dissolve**. An SVG filter — fractal-noise turbulence
feeding a displacement map (max→0) plus a gaussian blur (max→0) — resolves as
a `t` value runs 0→1, while opacity leads in the first ~12% of the settle.
Content reads as ink settling onto the page. This replaced all previous
clip-path wipes and the blob page transition.

### Primitives

| File                             | Mode     | Use                                                                                                                                                                              |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useInkFilter.jsx`     | scrubbed | Returns `{ defs, filter }`; drive `t` (a Framer `MotionValue`, 0 hidden → 1 settled) from scroll progress. Render `defs` anywhere near the element, put `filter` on its `style`. |
| `src/components/InkDissolve.jsx` | one-shot | `<InkReveal>` wrapper; fires once on scroll-into-view. Props: `duration`, `delay`, `margin`, `maxScale`, `maxBlur`, `octaves`.                                                   |

Both drop the filter to `none` outside `(0,1)` — settled elements regain
descendant `backdrop-filter` (glass tiles) and pure-compositor rendering;
hidden elements cost nothing. Reduced motion gets a plain fade, no filter.

Tuning rule of thumb: full sections use the defaults (`maxScale` 70, `maxBlur`
10, 4 octaves); smaller elements scale down (grid cards 40/8/2, bento tiles
50/8/3, hero eyebrow 30/8) so type stays legible and filters stay cheap.

### Where it's applied

- **Hero** — `PORTFOLIO 2026` eyebrow, one-shot on load.
- **About** (`GridMontage`) — each gallery card dissolves in on its own
  viewport entry and dissolves out ring-by-ring on scroll; one ink value
  `min(reveal, dissolve)` drives both. The white panel is a full-bleed flat
  fill, so its "dissolve" is an honest opacity fade (displacement has no
  interior detail to chew on).
- **About bento** (`AboutBento`) — tiles ink-dissolve into place, staggered,
  scrubbed by section progress.
- **Spotify tile** — transport buttons use blur+fade (the ink treatment at
  icon scale, where turbulence reads as noise).
- **Projects / Contact** — `<InkReveal>` around the section content.
- **Gallery** — ONE stage-wide filter scrubbed by the seam progress; the
  staggered pieces drift in through resolving ink.
- **Page transition** (`PageTransition` + `TransitionProvider`) — a fixed
  veil ramps `backdrop-filter: blur(24px)` as the section tint fades in
  (600ms), the Lenis jump happens under full cover, then it dissolves away.

Perf note: SVG filters rasterize on the CPU. The per-cell dissolves in
`GridMontage` are the heaviest spot — if low-end devices drop frames there,
lower `octaves`/`maxScale` first, then consider sharing one filter per ring.
