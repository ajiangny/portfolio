/**
 * ProfileHalftone.jsx — Cream Halftone Preset (About Section)
 *
 * Thin wrapper over the shared HalftoneCanvas engine: cream dots on
 * transparent with a bottom-up wave, used for the About background
 * (containerId="about") and the profile photo overlay (no containerId —
 * the photo's grid is local to its own box).
 *
 * `waveFront` may swap identity between mobile/desktop MotionValues;
 * the engine reads values through a ref so that's safe.
 */
import HalftoneCanvas from '../halftone/HalftoneCanvas'
import { waveUpStrategy } from '../halftone/halftoneStrategies'

export default function ProfileHalftone({ waveFront, waveHeight = 0.15, containerId }) {
  return (
    <HalftoneCanvas
      color="245,240,232"
      baseOpacity={0.05}
      strategy={waveUpStrategy}
      values={{ waveFront, waveHeight }}
      containerId={containerId}
      style={{ zIndex: 10 }}
    />
  )
}
