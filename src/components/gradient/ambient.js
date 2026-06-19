// src/components/gradient/ambient.js
// Pure: several slow points tracing Lissajous paths so the fluid is alive with
// no cursor. Each orbits its own centre (cx,cy) rather than the screen middle,
// so the points scatter across the field and their overlapping, advecting dye
// folds into a continuous liquid (with veins in the composite) instead of a
// few discrete blobs. Centres are biased to the upper/middle of the field so
// the bottom edge (where the white Hero wordmark sits) stays deep and readable.
// Low frequencies (ax/ay) keep the drift slow — each point's oscillation period
// is ~2π/freq seconds, so these wander over a minute-plus, not race around.
// (uv.y is 0 at the bottom, 1 at the top.)
const POINTS = [
  { cx: 0.20, cy: 0.78, r: 0.13, ax: 0.050, ay: 0.063, phx: 0.0, phy: 1.3 },
  { cx: 0.74, cy: 0.82, r: 0.12, ax: 0.037, ay: 0.045, phx: 2.1, phy: 4.0 },
  { cx: 0.50, cy: 0.60, r: 0.18, ax: 0.071, ay: 0.030, phx: 5.0, phy: 0.7 },
  { cx: 0.32, cy: 0.50, r: 0.12, ax: 0.044, ay: 0.055, phx: 1.1, phy: 2.6 },
  { cx: 0.82, cy: 0.58, r: 0.14, ax: 0.058, ay: 0.039, phx: 3.7, phy: 5.2 },
  { cx: 0.62, cy: 0.45, r: 0.14, ax: 0.040, ay: 0.070, phx: 4.4, phy: 0.2 },
]

/** @param {number} t seconds @returns {{x:number,y:number,dx:number,dy:number}[]} */
export function ambientSplats(t) {
  return POINTS.map((p) => ({
    x: p.cx + p.r * Math.sin(p.ax * t + p.phx),
    y: p.cy + p.r * Math.cos(p.ay * t + p.phy),
    dx: p.r * p.ax * Math.cos(p.ax * t + p.phx),
    dy: -p.r * p.ay * Math.sin(p.ay * t + p.phy),
  }))
}
