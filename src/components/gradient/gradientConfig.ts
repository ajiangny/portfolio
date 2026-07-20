/**
 * gradientConfig.ts — Palettes + tuning for the Three.js ink-fluid background.
 *
 * Each section provides a 2-stop `base` (the resting field gradient, top→bottom)
 * kept at a luminance that preserves that section's text contrast, and an `ink`
 * accent that the cursor + ambient drift inject as the visible liquid. The
 * active section is chosen by viewport centre and crossfades toward the next
 * (see paletteSelect.ts); the composite mixes base→ink by dye density.
 *
 * `energy` (0..1) scales the ambient stir for that section (see Simulation):
 * Hero churns hard so the dye folds into a deep-water look with caustic veins;
 * the other sections stay calm so their content reads cleanly. It crossfades
 * across seams just like the colours.
 */
import { rgb, type Vec3 } from './colors'

export interface SectionPalette {
  base: [Vec3, Vec3]
  ink: Vec3
  energy: number
}

export const SECTION_PALETTES: Record<string, SectionPalette> = {
  hero: { base: [rgb(22, 104, 222), rgb(14, 42, 140)], ink: rgb(64, 172, 250), energy: 1.0 },
  about: { base: [rgb(70, 112, 178), rgb(70, 83, 89)], ink: rgb(188, 203, 220), energy: 0.28 },
  projects: { base: [rgb(250, 248, 244), rgb(234, 228, 217)], ink: rgb(43, 82, 180), energy: 0.16 },
  gallery: { base: [rgb(20, 30, 64), rgb(0, 0, 0)], ink: rgb(90, 130, 235), energy: 0.34 },
  contact: { base: [rgb(40, 40, 46), rgb(0, 0, 0)], ink: rgb(240, 228, 205), energy: 0.34 },
}

// Stable-fluids sim tuning.
export const SIM = {
  // --- Resolution ---
  RES: 256,              // fluid grid size on desktop — higher = more detail, more GPU cost
  RES_MOBILE: 128,       // halved on mobile to save performance

  // --- Pressure Solver ---
  JACOBI: 18,            // Jacobi iterations per frame on desktop — more = smoother, more expensive
  JACOBI_MOBILE: 12,     // fewer iterations on mobile

  // --- Time & Dissipation ---
  DT: 0.1,               // advection timestep — lower = slower/calmer flow, higher = faster/more chaotic
  VEL_DISSIPATION: 0.985, // how fast velocity fades per frame — lower = thicker fluid, closer to 1 = flow persists longer
  DYE_DISSIPATION: 0.988, // how fast ink fades — higher = trails linger longer into veins, lower = evaporates quickly

  // --- Splat & Radius ---
  SPLAT_RADIUS: 0.0000275, // size of the cursor ink injection point — very small = precise thin thread of ink
  AMBIENT_RADIUS: 0.0205,  // spread of each ambient drift point — larger = softer, more blended wash

  // --- Forces ---
  CURSOR_FORCE: 5000,    // how hard the cursor pushes the fluid — higher = more dramatic mouse swirls
  AMBIENT_FORCE: 200,     // base background stir strength (×section energy) — higher = more background turbulence
  FORCE_CLAMP: 0.9,     // max force magnitude cap — prevents runaway velocity spikes

  // --- Density / Ink ---
  CURSOR_DENSITY: 0.5,     // dye injected by cursor per frame — 1 = full saturation at splat point
  AMBIENT_DENSITY: 0.025, // dye per ambient drift point — low so many overlapping points create a smooth wash, not blobs
  DYE_INTENSITY: 0.85,   // global ink vibrancy/opacity multiplier
  DYE_MAX: 1,            // max ink coverage — keeps ink from fully overwriting the base gradient (preserves text readability)

  // --- Refraction ---
  REFRACTION: 0.04,      // light-bending distortion on the composite — 0 = off, higher = more shimmer
}

export const GRADIENT = {
  SEAM_FADE: 0.85,
  MOBILE_SCALE: 0.5,
  FRAME_MS_MOBILE: 10,
  GRAIN: 0.06,   // film-grain intensity added in the composite (0 = off)
}
