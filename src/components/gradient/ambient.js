// src/components/gradient/ambient.js
// Pure: a few slow points tracing Lissajous paths so the fluid is alive with
// no cursor. Returns positions in 0..1 uv plus analytic velocity (dx,dy) used
// to inject a gentle drift force. Radii keep every point well inside [0,1].
const POINTS = [
  { r: 0.30, ax: 0.13, ay: 0.17, phx: 0.0, phy: 1.3 },
  { r: 0.36, ax: 0.09, ay: 0.11, phx: 2.1, phy: 4.0 },
  { r: 0.22, ax: 0.21, ay: 0.07, phx: 5.0, phy: 0.7 },
]

/** @param {number} t seconds @returns {{x:number,y:number,dx:number,dy:number}[]} */
export function ambientSplats(t) {
  return POINTS.map((p) => ({
    x: 0.5 + p.r * Math.sin(p.ax * t + p.phx),
    y: 0.5 + p.r * Math.cos(p.ay * t + p.phy),
    dx: p.r * p.ax * Math.cos(p.ax * t + p.phx),
    dy: -p.r * p.ay * Math.sin(p.ay * t + p.phy),
  }))
}
