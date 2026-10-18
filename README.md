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

## Visual style: riot

The site's look is the "riot" system: the *mechanics* of the Persona 5 UI
rebuilt in this site's own palette and fonts. Six rules, each applied
everywhere:

1. **Three flat colours with fixed jobs** — riot cobalt (field), cream
   (foreground face), slab ink (shadows, outlines, inverted letters). No
   soft gradients; the WebGL fluid is posterized into flat ink + halftone.
2. **One tilted axis** — headings, bands, menus and cards lean on `TILT`.
3. **No plain rectangles** — jagged `clip-path` silhouettes (`jagged()`,
   `jaggedPx()`, `.cut-a/b/c`).
4. **Selection is a costume change** — hover/active states flip colour,
   jump their hard shadow and knock off-angle; labels become ransom notes.
5. **Fast motion that overshoots, then holds** — `SNAP`, `ENTER_EASE`;
   one-shot reveals slam in, page changes slash-wipe through.
6. **Depth from stacked flat layers** — hard offset shadows, halftone
   screens, outlined stamps cropped off the viewport; never blur.

Primitives: `src/style/riot.ts` (palette, tilt, motion, shape helpers),
`src/components/style/` (`Ransom`, `SlashHeading`, `menuSignal`), and the
"Riot material" block in `src/index.css` (`.slab-wrap` / `.slab`,
`.halftone`). ARCHITECTURE.md § "Riot style" maps every rule to its files.

## Motion: the ink system (scrubbed effects)

The ink dissolve survives where it's scrubbed by scroll or hover: an SVG
filter — fractal-noise turbulence feeding a displacement map (max→0) plus a
gaussian blur (max→0) — resolves as a `t` value runs 0→1. One-shot reveals,
the loading veil and the page transition no longer use it (see "Visual
style" above): they are riot slams and slash wipes.

### Primitives

| File                             | Mode     | Use                                                                                                                                                                              |
| -------------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/hooks/useInkFilter.tsx`     | scrubbed | Returns `{ defs, filter }`; drive `t` (a Framer `MotionValue`, 0 hidden → 1 settled) from scroll progress. Render `defs` anywhere near the element, put `filter` on its `style`. |
| `src/components/InkDissolve.tsx` | one-shot | `<InkReveal>` wrapper, now a riot **slam** (skewed kick-in with overshoot) rather than a dissolve. Same props for compatibility; `maxScale`/`maxBlur`/`octaves` are ignored. |

The scrubbed filter drops to `none` outside `(0,1)` — settled elements get
pure-compositor rendering; hidden elements cost nothing. Reduced motion gets
a plain fade, no filter.

Tuning rule of thumb: full sections use the defaults (`maxScale` 70, `maxBlur`
10, 4 octaves); smaller elements scale down (grid cards 40/8/2, bento tiles
50/8/3, hero eyebrow 30/8) so type stays legible and filters stay cheap.

### Where it's applied

- **About** (`GridMontage`) — each gallery card dissolves in on its own
  viewport entry and dissolves out ring-by-ring on scroll; one ink value
  `min(reveal, dissolve)` drives both. The white panel is a full-bleed flat
  fill, so its "dissolve" is an honest opacity fade.
- **About bento** (`AboutBento`) — tiles ink-dissolve into place, staggered,
  scrubbed by section progress.
- **Spotify tile** — transport buttons use blur+fade.
- **Project hover thumbnails** — the hover image crossfades through ink.
- **Gallery** — ONE stage-wide filter scrubbed by the seam progress; the
  staggered pieces drift in through resolving ink.

Riot replacements (no SVG filter): the **loading screen** ticks the
monogram between snapped poses and slashes away left → right; the **page
transition** sweeps an ink slab then the section colour across on diagonal
edges (pure `clip-path`, identical on desktop and mobile); `<InkReveal>`
call sites (Hero eyebrow, Projects cards, Contact) slam in.

Perf note: SVG filters rasterize on the CPU. The per-cell dissolves in
`GridMontage` are the heaviest spot — if low-end devices drop frames there,
lower `octaves`/`maxScale` first, then consider sharing one filter per ring.
The full-viewport veils (loading screen, page transition) are clip-path
wipes now, so they never run a full-screen filter on any device (the old
`InkVeilCanvas` GPU fallback was removed with them).
