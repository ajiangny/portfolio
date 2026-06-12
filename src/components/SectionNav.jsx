/**
 * SectionNav.jsx — Floating Section Navigation Bar
 *
 * A compact navigation component pinned to the top of each section.
 * Shows the current section label by default; on hover (desktop) or
 * tap (mobile) it expands into organic blob buttons, one per section:
 *   • Desktop — horizontal row centred on the current section
 *   • Mobile  — vertical dropdown, current section on top
 *
 * The expanded state (gradient-blur curtain + blobs) is rendered into
 * <body> via portal: the sections pin content with position:sticky,
 * which creates stacking contexts the blobs could never escape from
 * in-tree (they'd paint behind project cards / under the overlay).
 * The dropdown is anchored to the trigger's measured screen position.
 *
 * Adapts its colours to the current section's background:
 *   • Light bg (Hero, Projects) → cobalt blobs with cream text
 *   • Dark bg (About) → cream blobs with cobalt text
 *   • Black bg (Gallery, Contact) → cream blobs with ink text
 *
 * Clicking a blob triggers the TransitionContext page transition.
 */
import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useTransitionContext } from '../context/TransitionContext';
import { SECTIONS, goToSection } from '../config/sections';
import useMediaQuery from '../hooks/useMediaQuery';

const ITEM_GAP = 105;   // desktop horizontal spacing
const ROW_GAP = 50;     // mobile vertical spacing

export default function SectionNav({ currentSection, style = {}, defaultTextColor = 'rgba(28,28,28,0.4)' }) {
  const { navigate: transitionNavigate } = useTransitionContext();
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredBlobId, setHoveredBlobId] = useState(null);
  // Anchor point (viewport coords) the portal dropdown is centred on
  const [anchor, setAnchor] = useState({ x: 0, y: 0 });
  const triggerRef = useRef(null);
  const lastScrollRef = useRef(0);
  // No hover on touch devices — expand as a vertical dropdown on tap instead
  const isMobile = useMediaQuery('(max-width: 767px)');

  const openNav = () => {
    const r = triggerRef.current?.getBoundingClientRect();
    setAnchor(r
      ? { x: r.left + r.width / 2, y: r.top + r.height / 2 }
      : { x: window.innerWidth / 2, y: 62 });
    setIsOpen(true);
  };

  const closeNav = () => {
    setIsOpen(false);
    setHoveredBlobId(null);
  };

  // Hover-open is suppressed while the page is actively scrolling —
  // sections sweeping under a stationary cursor shouldn't pop the menu.
  useEffect(() => {
    const mark = () => { lastScrollRef.current = performance.now(); };
    window.addEventListener('scroll', mark, { passive: true });
    window.addEventListener('wheel', mark, { passive: true });
    return () => {
      window.removeEventListener('scroll', mark);
      window.removeEventListener('wheel', mark);
    };
  }, []);

  const hoverOpen = () => {
    if (performance.now() - lastScrollRef.current < 250) return;
    openNav();
  };

  // While open: any scroll closes (the anchor would go stale), and on
  // desktop the menu closes when the pointer leaves the expanded row's
  // bounds. Geometric tracking is deterministic — enter/leave events
  // across the portal boundary are not (browsers don't re-fire them
  // when elements appear under a stationary cursor → flicker loop).
  useEffect(() => {
    if (!isOpen) return;
    const onScroll = () => closeNav();
    const onMove = (e) => {
      const halfW = ITEM_GAP * 2 + 115; // row spans ±(2·GAP + blob half)
      const halfH = 80;
      if (Math.abs(e.clientX - anchor.x) > halfW || Math.abs(e.clientY - anchor.y) > halfH) closeNav();
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    if (!isMobile) window.addEventListener('pointermove', onMove);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('pointermove', onMove);
    };
  }, [isOpen, isMobile, anchor.x, anchor.y]);

  const handleNavigate = (id, e) => {
    e.stopPropagation();
    closeNav();
    // Curtain colour + landing offset come from config/sections.js
    goToSection(transitionNavigate, id, e);
  };

  const currentIndex = SECTIONS.findIndex(s => s.label.toLowerCase() === currentSection.toLowerCase());
  const centerSection = currentIndex >= 0 ? SECTIONS[currentIndex] : SECTIONS[1];

  // Desktop: reorder so centerSection is in the middle (index 2).
  // Mobile: current section leads the vertical dropdown, others follow.
  const remainingSections = SECTIONS.filter(s => s.id !== centerSection.id);
  const displaySections = isMobile
    ? [centerSection, ...remainingSections]
    : [
        ...remainingSections.slice(0, 2),
        centerSection,
        ...remainingSections.slice(2)
      ];

  // Determine blob colors based on section background
  const isDarkBg = ['about', 'gallery', 'contact'].includes(currentSection.toLowerCase());
  const isBlackBg = ['gallery', 'contact'].includes(currentSection.toLowerCase());
  const blobBgColor = isDarkBg ? 'var(--color-cream, #F5F0E8)' : 'var(--color-cobalt, #1B3A8C)';
  const blobTextColor = isBlackBg ? '#1c1c1c' : isDarkBg ? 'var(--color-cobalt, #1B3A8C)' : 'var(--color-cream, #F5F0E8)';
  const blobShadowRgb = isDarkBg ? '245, 240, 232' : '27, 58, 140';

  return (
    <motion.div style={style} className="pointer-events-auto flex items-center justify-center z-50">
      {/* Expanded state — portal to <body> (see header comment) */}
      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <motion.div
              key="section-nav-expanded"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
            >
              {/* Progressive gradient blur curtain — three stacked layers
                  with decreasing blur and longer masks approximate a smooth
                  falloff (a single masked blur reads as a hard edge).
                  Desktop: pointer-events none — the curtain renders above
                  the trigger, and intercepting the pointer there flips
                  hover off/on in a loop (erratic open/close). Mobile keeps
                  it tappable as the close target. */}
              <div
                className="fixed inset-0 z-120"
                style={{ pointerEvents: isMobile ? 'auto' : 'none' }}
                onClick={closeNav}
              >
                {[
                  { blur: 20, fade: 'black 0%, transparent 30%' },
                  { blur: 9,  fade: 'black 0%, rgba(0,0,0,0.6) 30%, transparent 52%' },
                  { blur: 3,  fade: 'black 0%, rgba(0,0,0,0.5) 50%, transparent 72%' },
                ].map(({ blur, fade }) => (
                  <div
                    key={blur}
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      backdropFilter: `blur(${blur}px)`,
                      WebkitBackdropFilter: `blur(${blur}px)`,
                      maskImage: `linear-gradient(to bottom, ${fade})`,
                      WebkitMaskImage: `linear-gradient(to bottom, ${fade})`,
                    }}
                  />
                ))}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: 'linear-gradient(to bottom, rgba(8,10,22,0.26) 0%, rgba(8,10,22,0.08) 32%, transparent 60%)',
                  }}
                />
              </div>

              {/* Blob dropdown/row anchored to the trigger position */}
              <div
                className="fixed z-130"
                style={{ left: anchor.x, top: anchor.y, width: 0, height: 0 }}
              >
                {displaySections.map((section, i) => {
                  const isBlobHovered = hoveredBlobId === section.id;
                  const isShrunk = hoveredBlobId && !isBlobHovered;

                  const xOffset = isMobile ? 0 : (i - 2) * ITEM_GAP;
                  const yOffset = isMobile ? i * ROW_GAP : 0;

                  return (
                    <motion.div
                      key={section.id}
                      className="absolute flex items-center justify-center whitespace-nowrap font-sans font-bold uppercase tracking-[0.18em] cursor-pointer"
                      style={{
                        width: 95,
                        height: 42,
                        left: -47.5,
                        top: -21,
                        fontSize: '0.65rem',
                        color: blobTextColor,
                        borderRadius: section.blobShape,
                      }}
                      role="button"
                      tabIndex={0}
                      aria-label={`Go to ${section.label}`}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleNavigate(section.id, e) }
                        if (e.key === 'Escape') closeNav()
                      }}
                      initial={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
                      animate={{
                        x: xOffset,
                        y: yOffset,
                        opacity: 1,
                        scale: isBlobHovered ? 1.25 : isShrunk ? 0.85 : 1,
                        backgroundColor: blobBgColor,
                        boxShadow: isBlobHovered
                          ? `0 16px 44px rgba(${blobShadowRgb}, 0.65)`
                          : `0 4px 18px rgba(${blobShadowRgb}, 0.28)`,
                        zIndex: isBlobHovered ? 20 : 10,
                      }}
                      exit={{ x: 0, y: 0, opacity: 0, scale: 0.4 }}
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
                      <span style={{ pointerEvents: 'none' }}>{section.label}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* The Trigger */}
      <motion.div
        ref={triggerRef}
        className="relative flex items-center justify-center cursor-pointer pointer-events-auto"
        style={{ width: 160, height: 60 }}
        onHoverStart={() => !isMobile && hoverOpen()}
        onClick={() => isMobile && (isOpen ? closeNav() : openNav())}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        aria-label="Section navigation"
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); isOpen ? closeNav() : openNav() }
          if (e.key === 'Escape') closeNav()
        }}
      >
        <motion.div
          animate={{
            opacity: isOpen ? 0 : 1,
            scale: isOpen ? 0.8 : 1,
          }}
          transition={{ duration: 0.2 }}
          className="absolute flex items-center justify-center font-sans font-bold text-[11px] sm:text-[13px] tracking-[0.22em] uppercase whitespace-nowrap"
        >
          {/* Periodic diagonal shine doubles as the "I'm interactive" cue */}
          <span className="shine-text" style={{ '--shine-base': defaultTextColor }}>
            {centerSection.label}
          </span>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}
