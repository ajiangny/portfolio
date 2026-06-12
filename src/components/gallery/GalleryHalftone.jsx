/**
 * GalleryHalftone.jsx — Cream-on-Black Halftone Preset (Gallery / Contact)
 *
 * Thin wrapper over the shared HalftoneCanvas engine: cream dots on the
 * black sections, with an expanding pulse ring (Gallery scroll-in) and a
 * scroll-progress line band drawn directly in the dot grid.
 *
 * Both Gallery and Contact render this inside position:fixed layers so
 * the dot lattice is continuous across the two sections — pass
 * `headerOpacity` so the engine can skip drawing while the layer is
 * faded out (IntersectionObserver can't pause fixed elements).
 */
import HalftoneCanvas from '../halftone/HalftoneCanvas'
import { pulseLineStrategy } from '../halftone/halftoneStrategies'

export default function GalleryHalftone({ pulseProgress, lineProgress, headerOpacity, containerId }) {
  return (
    <HalftoneCanvas
      color="245,240,232"
      baseOpacity={0.05}
      strategy={pulseLineStrategy}
      values={{ pulseProgress, lineProgress }}
      containerId={containerId}
      headerOpacity={headerOpacity}
      style={{ zIndex: 0 }}
    />
  )
}
