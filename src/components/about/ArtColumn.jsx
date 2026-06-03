import { motion } from 'framer-motion';
import { DOT_BG } from '../../data/aboutData';

export default function ArtColumn({
  images,
  clearLast = false,
  scale,
  profileColorOpacity,
  profileDotsOpacity,
  profileCardRef,
}) {
  return (
    <div className="flex flex-col gap-4 w-full">
      {images.map((src, i) => {
        const isProfile  = clearLast && i === images.length - 1
        const dotsOpacity = isProfile && profileDotsOpacity ? profileDotsOpacity : 1

        return (
          <motion.div
            key={i}
            ref={isProfile ? profileCardRef : undefined}
            className="relative shrink-0"
            style={{
              aspectRatio: '2 / 3',
              width: '100%',
              scale,
              transformOrigin: 'center center',
              borderRadius: '12px',
            }}
          >
            <div className="absolute inset-0 overflow-hidden" style={{ borderRadius: '12px' }}>
              {/* Duotone image */}
              <img
                src={src}
                alt=""
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover"
                style={{ filter: 'url(#duotone-art)' }}
              />

              {/* Profile: full-colour cross-fade on reveal */}
              {isProfile && (
                <motion.img
                  src={src}
                  alt=""
                  loading="lazy"
                  className="absolute inset-0 w-full h-full object-cover"
                  style={{ opacity: profileColorOpacity }}
                />
              )}

              {/* Halftone overlay */}
              <motion.div
                className="absolute inset-0 pointer-events-none"
                style={{ opacity: dotsOpacity, ...DOT_BG, zIndex: 2 }}
              />
            </div>
          </motion.div>
        )
      })}
    </div>
  )
}
