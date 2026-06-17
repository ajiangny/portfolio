/**
 * LiquidGlassFilter.jsx — SVG refraction filter for the Hero wordmark.
 *
 * Renders a hidden, zero-size <svg> holding one <filter>. Anything that sets
 * `filter: url(#<id>)` gets warped by animated fractal-noise displacement —
 * the "liquid glass" flow. The constants below are the single source of truth
 * for the warp feel (tuned subtle, against the real Nevera font).
 *
 * `animated={false}` renders the filter WITHOUT the SMIL <animate> element, i.e.
 * a static, frozen warp. Driven by prefers-reduced-motion ONLY (the warp still
 * animates on mobile).
 */

// Subtle warp.
const BASE_FREQ = '0.010 0.015'                          // fractal-noise frequency (x y)
const DISPLACE = 7                                       // px of refraction displacement
const DRIFT = '0.010 0.015;0.013 0.010;0.010 0.015'     // baseFrequency keyframes (palindrome: end == start so the loop wraps seamlessly)
const DRIFT_DUR = '18s'
const SEED = 7

export default function LiquidGlassFilter({ id = 'hero-liquid-glass', animated = true }) {
  return (
    <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute', overflow: 'hidden' }}>
      <defs>
        {/* region bleeds 25% each side — must stay larger than DISPLACE px or glyph edges clip */}
        <filter id={id} x="-25%" y="-25%" width="150%" height="150%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency={BASE_FREQ}
            numOctaves={2}
            seed={SEED}
            result="noise"
          >
            {animated && (
              <animate
                attributeName="baseFrequency"
                dur={DRIFT_DUR}
                values={DRIFT}
                repeatCount="indefinite"
              />
            )}
          </feTurbulence>
          <feDisplacementMap
            in="SourceGraphic"
            in2="noise"
            scale={DISPLACE}
            xChannelSelector="R"
            yChannelSelector="G"
          />
        </filter>
      </defs>
    </svg>
  )
}
