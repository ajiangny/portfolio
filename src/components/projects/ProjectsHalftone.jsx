/**
 * ProjectsHalftone.jsx — Cobalt-on-Cream Halftone Preset (Projects)
 *
 * Thin wrapper over the shared HalftoneCanvas engine: cobalt dots on the
 * cream Projects section, combining
 *   • a radial wave that floods the screen as the cards exit, and
 *   • the horizontal line band that sweeps through during the
 *     About→Projects seam (both canvases run halves of one sweep).
 *
 * Also applies a scroll-driven grayscale filter as the cards fade to
 * black for the Gallery transition (fadeProgress 0.55→0.63).
 */
import { motion, useTransform, useMotionTemplate, useMotionValue } from 'framer-motion'
import HalftoneCanvas from '../halftone/HalftoneCanvas'
import { radialLineStrategy } from '../halftone/halftoneStrategies'

export default function ProjectsHalftone({ containerId, waveFront, waveHeight = 0.25, lineWaveFront, lineWaveHeight = 0.15, fadeProgress }) {
  // When the thumbnails start fading away (progress 0.55 → 0.63),
  // turn the halftone grayscale to match.
  const fallbackProgress = useMotionValue(0)
  const grayValue = useTransform(fadeProgress || fallbackProgress, [0.55, 0.63], [0, 1])
  const filterStyle = useMotionTemplate`grayscale(${grayValue})`

  return (
    <motion.div
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', filter: filterStyle }}
    >
      <HalftoneCanvas
        color="27,58,140"
        baseOpacity={0.08}
        strategy={radialLineStrategy}
        values={{ waveFront, waveHeight, lineWaveFront, lineWaveHeight }}
        containerId={containerId}
      />
    </motion.div>
  )
}
