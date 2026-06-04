import { useState } from 'react';
import { motion } from 'framer-motion';
import { useTransitionContext } from '../context/TransitionContext';

const SECTIONS = [
  { id: 'hero',    label: 'Home',     shape: '68% 32% 55% 45% / 48% 56% 44% 52%' },
  { id: 'about',   label: 'About',    shape: '44% 56% 65% 35% / 56% 44% 58% 42%' },
  { id: 'projects',label: 'Projects', shape: '58% 42% 38% 62% / 42% 62% 54% 46%' },
  { id: 'gallery', label: 'Gallery',  shape: '34% 66% 46% 54% / 62% 38% 52% 48%' },
  { id: 'contact', label: 'Contact',  shape: '54% 46% 58% 42% / 50% 52% 48% 50%' },
];

const HOVER_COLORS = [
  { id: 'hero',     rgb: [37,  79, 193] },
  { id: 'about',    rgb: [37,  79, 193] },
  { id: 'projects', rgb: [245,240, 232] },
  { id: 'gallery',  rgb: [0,    0,   0] },
  { id: 'contact',  rgb: [245,240, 232] },
];

export default function SectionNav({ currentSection, style = {}, defaultTextColor = 'rgba(28,28,28,0.4)' }) {
  const { navigate: transitionNavigate } = useTransitionContext();
  const [isHovered, setIsHovered] = useState(false);
  const [hoveredBlobId, setHoveredBlobId] = useState(null);

  const handleNavigate = (id, e) => {
    e.stopPropagation();
    setIsHovered(false);
    const colorObj = HOVER_COLORS.find(c => c.id === id);
    let colorStr = 'var(--color-cobalt, #1B3A8C)';
    if (colorObj) colorStr = `rgb(${colorObj.rgb.join(', ')})`;

    if (id === 'hero')         transitionNavigate('#hero', {}, e, colorStr);
    else if (id === 'about')   transitionNavigate(`#${id}`, { offset: window.innerHeight * 3 }, e, colorStr);
    else if (id === 'projects')transitionNavigate(`#${id}`, { offset: window.innerHeight }, e, colorStr);
    else if (id === 'contact') transitionNavigate(`#${id}`, { offset: window.innerHeight }, e, colorStr);
    else                       transitionNavigate(`#${id}`, {}, e, colorStr);
  };

  const currentIndex = SECTIONS.findIndex(s => s.label.toLowerCase() === currentSection.toLowerCase());
  const centerSection = currentIndex >= 0 ? SECTIONS[currentIndex] : SECTIONS[1];

  // Reorder so centerSection is in the middle (index 2)
  const remainingSections = SECTIONS.filter(s => s.id !== centerSection.id);
  const displaySections = [
    ...remainingSections.slice(0, 2),
    centerSection,
    ...remainingSections.slice(2)
  ];

  const ITEM_GAP = 105;

  // Determine blob colors based on section background
  const isDarkBg = ['about', 'gallery', 'contact'].includes(currentSection.toLowerCase());
  const isBlackBg = ['gallery', 'contact'].includes(currentSection.toLowerCase());
  const blobBgColor = isDarkBg ? 'var(--color-cream, #F5F0E8)' : 'var(--color-cobalt, #1B3A8C)';
  const blobTextColor = isBlackBg ? '#1c1c1c' : isDarkBg ? 'var(--color-cobalt, #1B3A8C)' : 'var(--color-cream, #F5F0E8)';
  const blobShadowRgb = isDarkBg ? '245, 240, 232' : '27, 58, 140';

  return (
    <motion.div style={style} className="pointer-events-auto flex items-center justify-center z-50">
      <motion.div
        className="relative flex items-center justify-center cursor-pointer pointer-events-auto"
        initial={false}
        animate={{
          width: isHovered ? 560 : 160,
          height: 60,
        }}
        transition={{ type: 'spring', stiffness: 400, damping: 30 }}
        onHoverStart={() => setIsHovered(true)}
        onHoverEnd={() => setIsHovered(false)}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* The Section Header (Trigger) */}
        <motion.div
          animate={{ opacity: isHovered ? 0 : 1, scale: isHovered ? 0.8 : 1 }}
          transition={{ duration: 0.2 }}
          className="absolute flex items-center justify-center font-sans font-bold text-[11px] sm:text-[13px] tracking-[0.22em] uppercase whitespace-nowrap transition-colors duration-300"
          style={{ color: defaultTextColor }}
        >
          {centerSection.label}
        </motion.div>

        {/* The Blobs */}
        <div className="absolute flex items-center justify-center" style={{ width: 0, height: 0 }}>
          {displaySections.map((section, i) => {
            const isBlobHovered = hoveredBlobId === section.id;
            const isShrunk = hoveredBlobId && !isBlobHovered;
            
            // X offset calculation: Center index is 2.
            const xOffset = isHovered ? (i - 2) * ITEM_GAP : 0;

            return (
              <motion.div
                key={section.id}
                className="absolute flex items-center justify-center whitespace-nowrap font-sans font-bold uppercase tracking-[0.18em] cursor-pointer"
                style={{
                  width: 95,
                  height: 42,
                  fontSize: '0.65rem',
                  color: blobTextColor,
                  borderRadius: section.shape,
                  pointerEvents: isHovered ? 'auto' : 'none',
                }}
                initial={false}
                animate={{
                  x: xOffset,
                  opacity: isHovered ? 1 : 0,
                  scale: isHovered ? (isBlobHovered ? 1.25 : isShrunk ? 0.85 : 1) : 0.4,
                  backgroundColor: blobBgColor,
                  boxShadow: isBlobHovered
                    ? `0 16px 44px rgba(${blobShadowRgb}, 0.65)`
                    : `0 4px 18px rgba(${blobShadowRgb}, 0.28)`,
                  zIndex: isBlobHovered ? 20 : 10,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 30,
                  opacity: { duration: 0.2 },
                }}
                onHoverStart={() => setHoveredBlobId(section.id)}
                onHoverEnd={() => setHoveredBlobId(null)}
                onClick={(e) => handleNavigate(section.id, e)}
              >
                <span style={{ pointerEvents: 'none' }} className="flex items-center gap-1.5">
                  <span className="rounded-full shrink-0" style={{ width: '4px', height: '4px', backgroundColor: 'currentColor', opacity: 0.4 }} />
                  {section.label}
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}
