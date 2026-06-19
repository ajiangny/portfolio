# Hero Readability + Fluid Liquid Gradient — Design Spec

**Date:** 2026-06-14
**Status:** Approved design, pending implementation plan
**Area:** Hero section + site-wide fluid gradient background

## Summary

Two coupled changes to the landing experience:

1. **Hero readability** — today the wordmark, nav bubbles, and gradient field are
   all cobalt, so nothing separates from the background. Fix the figure/ground so
   elements clearly lift off the field. Layout is unchanged (orbiting nav bubbles +
   "Portfolio" wordmark + name tag).
2. **Fluid liquid gradient** — replace the current subtle domain-warp cursor nudge
   with a real, low-resolution GPU fluid simulation (Jos Stam "Stable Fluids"
   method) that produces a *liquid push* under the pointer and a *flowing wake* that
   advects and settles. Hovering a nav blob shifts the field's colors and flow
   direction toward that section's palette (a destination preview). Touch (tap/drag)
   drives the same effect on mobile.

The fluid sim is composited *into* the existing per-section palette gradient — it
does not replace it. The section palettes, seam/flood/pulse choreography, and the
"the canvas *is* the page background" contract all remain.

## Goals

- Wordmark, bubbles, and name tag are clearly legible at rest and in every hover state.
- Cursor/touch motion feels like pushing thick liquid, leaving a wake that dissipates.
- Each nav blob hover previews its section: field color + flow direction shift, and
  Hero elements recolor in sync.
- Works on desktop (mouse) and mobile (touch); degrades gracefully where GPU features
  are missing, on reduced-motion, and stays within the existing performance budget.

## Non-goals / out of scope

- No Hero layout restructure (scope locked to "contrast fix only").
- No new runtime dependency (no three.js / react-three-fiber). Stays on the existing
  raw WebGL1 renderer.
- No change to non-Hero section content; only the shared gradient background gains
  the sim layer, and only Hero gains the hover-preview + recolor.
- Not a full-fidelity fluid background (the sim is a low-res displacement source, not
  the visible surface).

## Locked decisions

| Decision | Choice |
|---|---|
| Redesign scope | Contrast fix only — layout unchanged |
| Figure/ground | Cobalt field stays; elements go light (cream wordmark, cream-fill/cobalt-text bubbles) |
| Ripple character | Liquid push + flowing wake |
| Hover behavior | Literal preview — field shifts to the section's real palette; elements recolor |
| Engine | Hybrid: low-res real fluid sim drives displacement, composited over the palette gradient |
| Mobile | Touch-driven sim (tap = drop, drag = push/wake), gated + reduced budget |

## Visual contract

**At rest** (top of Hero, no hover): cobalt fluid field; **cream wordmark**; bubbles
**cream fill / cobalt text**; name tag cream.

**On hover** the field crossfades (~0.35s) toward the hovered section's palette and the
flow leans in a distinct direction, while DOM elements recolor in sync. Rule: *light
field → dark elements; dark field → light elements.*

| Hover target | Field shifts to | Flow leans | Wordmark | Bubbles (fill / text) |
|---|---|---|---|---|
| *(rest)* | cobalt | ambient drift | cream | cream / cobalt |
| About | brighter cobalt | up-right | cream | cream / cobalt |
| Projects | cream | right | cobalt | cobalt / cream |
| Gallery | near-black | down | cream | cream / near-black |
| Contact | black + warm | left | cream | cream / near-black |

Field palettes come from the existing per-section `SECTION_PALETTES`. About's palette
is in the same cobalt family as rest, so its hover differentiates mainly via flow
direction plus a small brightness bump (tunable). Recolor replaces the ad-hoc swap
logic in `Hero.jsx` with a small per-section element-theme table.

**Ripple feel:** pointer motion injects force into the sim; the field bulges around the
pointer (push) and the motion advects into a trailing wake that damps and settles when
motion stops. Strength / viscosity / wake-length / displacement-scale are tunable
constants dialed in live. Disabled under reduced-motion (calm static field).

## Architecture

### Hybrid pipeline (per frame, when sim is active)

```
pointer (position + velocity; mouse on desktop, touch on mobile)
   │  inject force (+ optional dye/ink splat)
   ▼
┌──────── fluid sim  (low-res, float/half-float textures, ping-pong) ────────┐
│ advect velocity → addForce → divergence → jacobi ×N → subtractPressureGrad  │ → velocity texture
│ velocity damped each frame (wake settles)                                   │  (+ light dye scalar)
└─────────────────────────────────────────────────────────────────────────────┘
   │  uVelocity / uDye samplers, uSimEnabled = 1
   ▼
display shader (existing domain-warp fBm):
   p += velocity * DISP_SCALE        // liquid displacement of the palette
   → palette(section A→B crossfade)
   → hover-palette crossfade (uHoverMix)
   → uFlowDir lean
   → seam / flood / pulse choreography
   → optional dye highlight along the wake
   ▼
fixed full-viewport canvas, z-index −1   (unchanged)
```

When the sim is **inactive** (unsupported / reduced-motion / fully settled / idle on
mobile), the display shader runs exactly as today with `uSimEnabled = 0`; the legacy
`uMouseStrength` Gaussian warp remains available for the desktop no-float fallback.

### Modules

| Module | Responsibility |
|---|---|
| `gradient/fluidSim.js` (new) | Owns the sim: programs, FBOs, float/half-float textures, `step(dt, pointer)`, `velocityTexture`, `dyeTexture`, `supported`, `resize`, `dispose`. Capability-detects float/half-float render targets; `supported=false` ⇒ caller skips it. |
| `gradient/simShaders.js` (new) | GLSL for advect / addForce / divergence / jacobi / subtractPressureGradient. Written from scratch (Stam method); `jwagner/fluidwebgl` is conceptual reference only — it is not OSS-licensed and no code is copied. |
| `gradient/shaders.js` (edit) | Extend display frag: `uVelocity`/`uDye` samplers, `uSimEnabled`, `uFlowDir`, hover-palette crossfade (`uHoverPal0/1/2`, `uHoverMix`). |
| `gradient/glRenderer.js` (edit) | Teach `setUniforms` to bind sampler textures; stay null-safe. |
| `gradient/gradientConfig.js` (edit) | New constants: desktop + mobile `SIM_RES`, `JACOBI_ITERS`, velocity/dye dissipation, force radius+strength, `DISP_SCALE`, per-nav flow angles, hover-crossfade speed, About hover brightness bump. |
| `context/GradientContext` + `GradientProvider` (edit) | Two new registered signals: `heroHover` (target section index; −1 = none) and `heroHoverStrength` (0→1). Both rest at off (strength 0). |
| `components/Hero.jsx` (edit) | On blob hover set the signals; refactor `updateColor` into the table-driven recolor; at-rest = cream elements. |
| `components/gradient/FluidGradient.jsx` (edit) | Orchestrate sim vs. display-only; add touch listeners; gate stepping to active-interaction + settle; read hover signals → `uHoverMix` + lerp `uFlowDir`. |

### Signals (hover → gradient)

- `heroHover`: MotionValue holding the hovered nav target's section index, or −1.
- `heroHoverStrength`: MotionValue 0→1, animated up on hover-start, down on hover-end.
- Both follow the global-signal rule: when Hero is not the active section or no blob is
  hovered, `heroHoverStrength` rests at **0** so the override fully releases (same
  discipline as `flood`). The display shader reads `heroHover` to pick the hover palette
  + flow angle, and `heroHoverStrength` as the crossfade amount.
- Field crossfade and the CSS-variable element recolor use matching ~0.35s durations so
  they stay visually in sync.

### Fluid sim details

- **Resolution:** `SIM_RES` ≈ ¼ of display (e.g. ~256² desktop, smaller on mobile),
  aspect-matched. `JACOBI_ITERS` ≈ 20 desktop, fewer on mobile.
- **Textures:** velocity (RG/RGBA), pressure (R), divergence (R), optional dye scalar —
  ping-pong pairs where needed. Prefer full float on desktop, **half-float on mobile**.
- **Passes:** advect velocity → addForce (cursor/touch splat, force ∝ pointer velocity,
  clamped) → divergence → jacobi ×N (pressure solve) → subtractPressureGradient
  (divergence-free) → advect dye. Velocity and dye damped per frame so the wake settles.
- **Boundaries:** simple damping/free-slip; no rigid walls needed for a background.
- **Idle gating:** step the sim only while interaction is active **or** residual velocity
  exceeds an epsilon; otherwise skip sim passes (display still samples the now-near-zero
  velocity → no displacement). Applied on both platforms; on mobile this means zero sim
  cost while reading/scrolling.

### Mobile touch handling

- `touchstart`/`touchmove`/`touchend` feed pointer position + velocity into the sim,
  mirroring the desktop mouse. Tap = small radial splat; drag = push + wake.
- Listeners are **passive and never call `preventDefault`** — the ripple is purely the
  reacting background; the touch still scrolls (Lenis) / navigates unchanged.
- Injected force is **clamped by pointer velocity** so a fast scroll-flick can't blast the
  field.
- Default scope: works anywhere (mirrors desktop's global cursor warp), kept cheap by the
  idle gating. Tuning knob: scope to Hero only if it feels distracting in lower sections.
- This intentionally revises the CLAUDE.md statement that the gradient "disables cursor
  warp on mobile"; that doc is updated as part of the work.

## Fallbacks & preserved contracts

- **No float/half-float render targets:** `fluidSim.supported = false` ⇒ display-only
  domain-warp gradient (today's look); desktop keeps the legacy `uMouseStrength` warp.
- **Mobile without (half-)float:** calm gradient, no ripple.
- **Reduced-motion:** sim off; single static frame (unchanged mechanism).
- **z-index / background:** canvas stays fixed full-viewport at z-index −1; the gradient
  must always render (fallback guarantees this).
- **StrictMode / dispose:** the sim allocates and deletes its own programs/FBOs/textures.
  Do **not** call `WEBGL_lose_context.loseContext()` (same caveat as `glRenderer.dispose`)
  — the remount reuses the same context.
- **RAF/refs:** the loop reads motion values and pointer state through refs each frame,
  never captured in `[]`-dep effect closures.

## Performance

- Low-res sim (~256² desktop) × ~20 Jacobi iterations at the existing ~30fps cap is a few
  million fragment ops/frame — minor next to the full-res fBm that already dominates.
- Idle gating drops sim cost to zero when nothing is moving, protecting mobile battery and
  smooth-scroll responsiveness.
- Mobile keeps the existing half-resolution display buffer plus a reduced sim budget.

## Verification

- `npm run lint` → 0 problems.
- `node scripts/console-check.mjs` → no shader compile/runtime errors, root renders
  (catches white-screen / sampler-binding mistakes).
- `node scripts/screenshot.mjs baseline` before changes; a fresh set after; diff desktop /
  tablet / mobile. The harness's software WebGL may lack float render targets — acceptable,
  it simply exercises the fallback and still renders the gradient.
- Manual live check on desktop (mouse push/wake, four hover previews) and a touch device or
  emulation (tap/drag ripple, scroll still works).

## Open tuning knobs (resolved live, not blocking)

- Force strength, viscosity/dissipation, wake length, `DISP_SCALE`.
- `SIM_RES` and `JACOBI_ITERS` per platform (quality vs. perf).
- Per-nav flow-angle directions and the About hover brightness bump.
- Optional dye/ink highlight intensity (can be dropped if velocity displacement alone
  reads well).
- Whether mobile touch ripple is global or Hero-scoped.

## Risks

- **Mobile float-texture variance** → mitigated by half-float preference + capability
  detection + graceful fallback.
- **Touch ripple vs. scroll** → mitigated by passive listeners, no `preventDefault`,
  velocity-clamped force.
- **Field-recolor vs. element-recolor desync** → mitigated by matched ~0.35s durations.
- **Sim/display sampler plumbing in WebGL1** → covered by `console-check.mjs` and the
  always-render fallback.
