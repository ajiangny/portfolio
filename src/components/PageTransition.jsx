import { motion } from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import { BLOB_SHAPES } from './hero/orbitConstants'

export default function PageTransition() {
  const { isActive, clickPos, transitionColor } = useTransitionContext()

  return (
    <div className="fixed inset-0 pointer-events-none z-9999 overflow-hidden">
      <motion.div
        initial={false}
        animate={{
          scale: isActive ? 3 : 0,
          borderRadius: isActive ? [BLOB_SHAPES[0], BLOB_SHAPES[1]] : BLOB_SHAPES[2]
        }}
        transition={{
          duration: 0.6,
          ease: [0.76, 0, 0.24, 1] // Snappy curtain curve
        }}
        style={{
          position: 'absolute',
          top: clickPos?.y || 0,
          left: clickPos?.x || 0,
          x: '-50%',
          y: '-50%',
          width: '120vmax',
          height: '120vmax',
          backgroundColor: transitionColor,
          transformOrigin: 'center center',
        }}
      />
    </div>
  )
}
