# Fluid Interactive Gradient Background — Design

**Date:** 2026-06-14
**Status:** Approved (pending spec review)
**Replaces:** the entire halftone dot system across all five sections

## 1. Goal

Replace every halftone dot effect on the portfolio with a single site-wide,
cursor-reactive **WebGL mesh gradient** (domain-warped fBm noise — the
"Stripe / paper.design" aesthetic). The gradient must preserve the
scroll-driven section transitions the halftone currently performs, react to
the cursor by locally warping the field, and keep the project's existing
performance and accessibility discipline.

### Decisions locked during brainstorming
- **Scope:** all five sections (Hero → About → Projects → Gallery → Contact).
- **Technique:** WebGL mesh gradient (not CSS, not a full fluid simulation).
- **Interaction:** cursor warps/displaces the gradient field locally.
- **Gallery progress line:** **dropped.** The functional scroll indicator goes
  away; only the pulse-ring transition is translated.

## 2. Why this is more than a cosmetic swap

The halftone is not decoration — it carries the site's transition
choreography, and its grid is deliberately continuous across section seams
(`computeGlobalOffsetY` in `halftoneCore.js`). The dots do real work:

| Section | What the dots do today | Driven by |
|---|---|---|
| Hero | density gradient dissolving into cobalt; cursor proximity boost; hue-shift on hover | `HalftoneBg`, `colorRgbValue` |
| About→Projects seam | a horizontal line band sweeps across two canvases as the literal seam | `lineWaveFront` (0→2 / −1→1) |
| Projects exit | radial wave floods the screen as cards turn blue — drives the Gallery handoff | `projectsWaveFront` |
| Gallery | pulse ring on scroll-in + progress line (scroll indicator) | `pulseProgress`, `lineProgress` |
| Contact | shares Gallery's fixed lattice so the grid is unbroken | `headerOpacity` gate |

Therefore the work is two separable concerns: (a) swap the **visual
primitive** (discrete lattice → continuous field), and (b) **re-home the
scroll-state semantics** onto the new primitive. All of (b) is already driven
by Framer `MotionValue`s; we retarget what those values animate, not the
timing.

## 3. Architecture

**One `<FluidGradient>` component**, mounted once in `src/App.jsx` as a
`position: fixed`, full-viewport WebGL layer at the very back of the z-index
stack (same band the halftone canvases occupy now — below all section
content). One fullscreen-quad fragment shader.

> **Refinement (added during implementation):** because the gradient is one
> fixed canvas behind everything, sections must become **background-transparent**
> for it to show (root `bg-cream`, About's `--color-cobalt`, Gallery/Contact
> `#000` all removed). The gradient therefore *is* the page background, and each
> section's at-rest palette reproduces its former background colour so text
> contrast holds — and the palettes had to be corrected against the *actual*
> backgrounds: **About is cobalt, not cream**, and Projects is cream (cobalt
> there comes only from the exit flood). `body` keeps cream as the no-WebGL
> fallback.

Benefits over the current 5-canvas approach:
- Cross-section continuity is free (one physical surface) — no offset alignment
  math.
- Collapses 5 canvases + 5 RAF loops into 1.
- Centralizes performance gating and reduced-motion handling.

**Renderer:** hand-rolled minimal WebGL (single quad, one shader program, no
3D framework). Rationale: the existing halftone engine is fully bespoke; the
codebase's idiom is to own its rendering. A fullscreen shader runner is small.
`ogl` (~10kb) is an acceptable thin alternative if we decide not to own the GL
boilerplate; react-three-fiber is explicitly **not** used (too heavy for one
quad).

## 4. File structure

New:
- `src/components/gradient/FluidGradient.jsx` — canvas + WebGL lifecycle:
  context creation, resize (ResizeObserver), RAF loop with ~30fps throttle,
  visibility/scroll-range pause, reduced-motion freeze, per-frame uniform
  upload. Structural analog of `HalftoneCanvas.jsx`.
- `src/components/gradient/gradient.vert` / `gradient.frag` — vertex (trivial
  fullscreen quad) and fragment (mesh gradient) shaders. Imported as strings
  via Vite's `?raw`.
- `src/components/gradient/gradientConfig.js` — per-section palettes (sourced
  from existing tokens, see §8) and shared constants (warp scale, octaves,
  cursor falloff radius, build/decay rates).
- `src/hooks/useGradientController.js` — reads global scroll + section
  transition MotionValues and exposes the uniform set the component uploads
  each frame. Keeps `FluidGradient.jsx` focused on GL, the hook on choreography.

Changed: `src/App.jsx` (mount), `src/config/sections.js` (export palette
mapping if not already derivable), `CLAUDE.md`, `docs/ARCHITECTURE.md`.

Deleted (after migration, §9): `src/components/halftone/*`,
`src/components/about/ProfileHalftone.jsx`,
`src/components/projects/ProjectsHalftone.jsx`,
`src/components/gallery/GalleryHalftone.jsx`,
`src/components/hero/HalftoneBg.jsx`, and the wiring in `Hero.jsx`,
`About.jsx`, `Projects.jsx`, `Gallery.jsx`, `Contact.jsx`.

## 5. Shader design

Domain-warped fractal Brownian motion:
1. 2–3 octaves of value/simplex noise produce a base field, animated by
   `uTime`.
2. A `warp` vector (itself noise-derived) offsets the color-lookup
   coordinate, giving the flowing, liquid quality.
3. Final color = mix across 3–4 palette stops for the current section,
   crossfaded toward the next section's palette by scroll position.

Kept intentionally fill-bound and cheap: no post-processing passes, no
framebuffer ping-pong (that path is for a true fluid sim, which we explicitly
rejected). One pass, one draw call per frame.

## 6. Uniforms & data flow

| Uniform | Source | Purpose |
|---|---|---|
| `uTime` | RAF clock | base flow animation |
| `uResolution` | canvas size | aspect / coordinate scaling |
| `uMouse` | window mousemove (px) + velocity | cursor warp center |
| `uMouseStrength` | build-up/decay (port of 0.15 up / 0.03 down feel) | warp intensity that fades when cursor rests |
| `uScrollProgress` | global scroll 0→1 | palette crossfade between sections |
| `uSeam` | `lineWaveFront` (existing) | About→Projects sweep band |
| `uFlood` | `projectsWaveFront` (existing) | Projects→Gallery radial color bloom |
| `uPulse` | `pulseProgress` (existing) | Gallery scroll-in radial wave |

MotionValues are read through a ref each frame (same pattern as
`HalftoneCanvas` — never captured in `[]`-dep closures), so swapping
MotionValue identity (mobile/desktop variants) stays safe.

## 7. Interaction — cursor warp

Mouse position + velocity feed a local displacement added to the warp field,
with a radial falloff so the field bends near the pointer and relaxes with
distance. Strength builds while the mouse moves and decays when it rests,
reproducing the current hover-boost feel. Applied globally (one gradient), so
the effect is consistent across all sections instead of per-canvas.

Disabled on touch / mobile (see §9).

## 8. Per-section palettes

Sourced from existing single-sources-of-truth so the gradient stays on-brand
and palette edits remain centralized:
- Section colors / nav colors: `src/config/sections.js`.
- Design tokens (cobalt, cream, etc.): `@theme` in `src/index.css`.

Intended palette character (exact stops finalized in implementation against
the tokens):
- **Hero:** cobalt blues (`27,58,140` → `37,79,193`) — matches the current
  dynamic hue-shift range.
- **About:** warm cream (`245,240,232`) field.
- **Projects:** cream → cobalt → black (carries the card "turn blue then
  fade to black" handoff).
- **Gallery / Contact:** black with cream accents.

The shader crossfades adjacent palettes by `uScrollProgress`, so
section-to-section color flow is automatic and continuous.

## 9. Choreography translation

Each transition is re-homed onto the same MotionValue that drives it today:

| Today (dots) | Becomes (gradient) | MotionValue |
|---|---|---|
| About→Projects line sweep | bright luminance band sweeping across the field at the seam | `lineWaveFront` |
| Projects radial flood | radial color bloom center→full-screen cobalt as cards turn blue | `projectsWaveFront` |
| Gallery pulse ring | expanding radial wave in the gradient on scroll-in | `pulseProgress` |
| Gallery progress line | **DROPPED** — removed entirely, including `lineProgress` wiring | — |

## 10. Performance & fallbacks

Carried over from the halftone system's discipline:
- **`prefers-reduced-motion`** → render a single static gradient frame, no
  RAF. Hook into the existing global mechanism (MotionConfig + CSS).
- **Off-screen / tab hidden** → pause RAF. A fixed canvas always "intersects",
  so gate on scroll range / Page Visibility (mirrors Contact's `headerOpacity`
  trick).
- **Mobile** (`useMediaQuery('(max-width: 767px)')`) → disable cursor warp,
  render at 0.5× resolution upscaled (fill-rate saving), keep scroll-driven
  color.
- **No WebGL / context loss** → CSS static gradient fallback using the same
  palette tokens.
- **Budget:** ~30fps target (matching the halftone's `FRAME_MS`); the shader
  is fill-bound, comfortable at this rate. GL context lazy-initialized so it
  doesn't block first paint.

## 11. Migration plan & order

Incremental, validated per step:
1. **Baseline:** capture `node scripts/screenshot.mjs baseline` before any
   change.
2. **Hero vertical slice:** `FluidGradient` + shader + cursor warp, no seam
   semantics. Validate look + perf. Bail-cheap checkpoint.
3. **About:** wire palette + (no seam yet beyond color).
4. **Projects:** wire `lineWaveFront` seam band + `projectsWaveFront` flood.
5. **Gallery / Contact:** wire `pulseProgress`; confirm continuity across the
   two fixed sections.
6. **Cleanup:** delete halftone modules/presets, remove `lineProgress`
   wiring, update `CLAUDE.md` + `docs/ARCHITECTURE.md`. Restart dev server
   (Vite stale-module-graph gotcha).

## 12. Risks

- WebGL context loss / older GPUs — mitigated by CSS fallback.
- The mesh-gradient aesthetic is softer than the crisp dot lattice and shifts
  the site's character more than a literal "replace" implies; Hero-first
  checkpoint exists to catch this early.
- Bundle: shader source is tiny, but lazy-init the GL context to protect first
  paint.

## 13. Verification

- `node scripts/screenshot.mjs <set>` before/after each section; diff against
  `baseline`.
- `node scripts/console-check.mjs` after each step to catch WebGL
  white-screens.
- `npm run lint` kept at 0 problems.
- Manual: reduced-motion (static frame), mobile (no cursor warp, half-res),
  scroll through all four seams, tab-away/return (RAF pauses/resumes).

## 14. Out of scope (YAGNI)

- True fluid simulation (Navier-Stokes / framebuffer ping-pong).
- react-three-fiber or any 3D scene graph.
- Re-introducing the dropped Gallery scroll indicator in any form.
- Per-section separate canvases (the single-canvas design supersedes this).
