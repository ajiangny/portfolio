import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring, useMotionValue } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'
import ProjectsHalftone from './projects/ProjectsHalftone'
import { works } from '../data/projectsData'
import { GitHubIcon, ExternalIcon } from './icons'
import StackIcon from 'tech-stack-icons'

const TECH_ICON_MAP = {
  'React': { icon: 'react' },
  'Tailwind CSS': { icon: 'tailwindcss' },
  'Tailwind': { icon: 'tailwindcss' },
  'Framer Motion': { icon: 'framer' },
  'Vite': { icon: 'vitejs' },
  'Python': { icon: 'python' },
  'Photoshop': { custom: 'Ps', color: '#31A8FF' },
  'Next.js': { icon: 'nextjs' },
  'TypeScript': { custom: 'TS', color: '#3178C6' },
  'Express': { custom: 'Ex', color: '#333333' },
  'Three.js': { custom: 'T3', color: '#000000' },
  'Gemini API': { custom: 'AI', color: '#1A73E8' },
  'SQLite': { icon: 'mysql' },
  'Flet': { custom: 'Fl', color: '#1B3A8C' },
  'Figma': { icon: 'figma' },
  'Illustrator': { custom: 'Ai', color: '#FF9A00' },
  'Design': { custom: 'UI', color: '#E84545' },
  'Automation scripts': { custom: 'Sh', color: '#4CAF50' }
};

const ProjectCard = ({ work, i, isActive, widthClass, translateX, scale, zIndexClass, cardOpacity, cardShadow, onClick, dragged, worksLength }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
  const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], [-10, 10]);

  const handleMouseMove = (e) => {
    if (dragged) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const xPct = mouseX / width - 0.5;
    const yPct = mouseY / height - 0.5;
    x.set(xPct);
    y.set(yPct);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <div 
      onClick={onClick}
      className={`relative flex flex-col ${widthClass} shrink-0 px-2 snap-center transition-all duration-500 ${zIndexClass}`}
      style={{ cursor: isActive ? 'auto' : 'pointer' }}
    >
      <motion.article 
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="group relative w-full aspect-video rounded-2xl border border-white/40 select-none overflow-hidden bg-white/40 backdrop-blur-lg flex items-center justify-center shadow-[inset_0_0_20px_rgba(255,255,255,0.5)]"
        animate={{
          x: `${translateX}%`,
          scale: scale,
          opacity: cardOpacity,
          boxShadow: cardShadow,
        }}
        transition={{ duration: 0.5, ease: "easeInOut" }}
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          transformPerspective: 1000,
        }}
      >
        <motion.span 
          style={{ translateZ: 50 }}
          className={`font-display text-6xl md:text-7xl lg:text-8xl transition-colors duration-500 ${isActive ? 'text-cobalt/40' : 'text-ink/20 group-hover:text-cobalt/40'}`}
        >
          {((i % worksLength) + 1).toString().padStart(2, '0')}
        </motion.span>
        
        <motion.div 
          style={{ translateZ: 30 }}
          className={`absolute top-3 right-3 flex gap-2 transition-opacity duration-500 ${isActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        >
          {work.tech.map((t, index) => {
            const mapped = TECH_ICON_MAP[t] || { custom: t.substring(0, 2).toUpperCase(), color: '#1B3A8C' };
            return (
              <div 
                key={index}
                className="group/icon w-8 h-8 rounded-full bg-white/50 backdrop-blur-md border border-white/20 flex items-center justify-center hover:bg-white/80 transition-colors"
                title={t}
              >
                {mapped.icon ? (
                  <div className="w-4 h-4 grayscale opacity-70 group-hover/icon:grayscale-0 group-hover/icon:opacity-100 transition-all duration-300">
                    <StackIcon name={mapped.icon} />
                  </div>
                ) : (
                  <span className="font-bold text-[11px] opacity-70 group-hover/icon:opacity-100 transition-opacity duration-300" style={{ color: mapped.color }}>
                    {mapped.custom}
                  </span>
                )}
              </div>
            )
          })}
        </motion.div>
      </motion.article>

      <div className={`mt-5 px-1 flex justify-between items-start transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
        <div className="flex-1 pr-4">
          <h3 className="font-sans font-semibold text-lg md:text-xl lg:text-2xl text-ink mb-1 tracking-tight">
            {work.title}
          </h3>
          <p className="font-mono text-ink/50 text-[11px] md:text-xs line-clamp-2">
            {work.subtitle}
          </p>
        </div>
        
        <div className="flex gap-3 shrink-0 mt-0.5">
          {work.github && (
            <a href={work.github} target="_blank" rel="noopener noreferrer" className="text-ink/50 hover:text-cobalt transition-colors pointer-events-auto" aria-label={`${work.title} on GitHub`}>
              <GitHubIcon />
            </a>
          )}
          {work.live && (
            <a href={work.live} target="_blank" rel="noopener noreferrer" className="text-ink/50 hover:text-cobalt transition-colors pointer-events-auto" aria-label={`${work.title} live demo`}>
              <ExternalIcon />
            </a>
          )}
        </div>
      </div>
    </div>
  )
}

export default function Projects() {
  const containerRef = useRef(null)
  
  const [activeHeight, setActiveHeight] = useState(0)
  
  useEffect(() => {
    setActiveHeight(window.innerHeight * 3)
  }, [])
  
  const rawProgress = useScrollTimeline(containerRef, activeHeight)
  const progress = useSpring(rawProgress, { stiffness: 400, damping: 40 })

  const headerY = useTransform(progress, [0, 0.15], [0, -40])

  // Multiply works array to create a wide runway for seamless infinite scrolling
  const infiniteWorks = [...works, ...works, ...works, ...works, ...works]
  const scrollRef = useRef(null)
  
  const [activeIndex, setActiveIndex] = useState(works.length * 2)

  useEffect(() => {
    // Initial center position to allow scrolling left immediately
    if (scrollRef.current && scrollRef.current.children.length > 0) {
      setTimeout(() => {
        const el = scrollRef.current
        if (el && el.children[works.length * 2]) {
          const target = el.children[works.length * 2];
          el.scrollLeft = target.offsetLeft + (target.offsetWidth / 2) - (el.clientWidth / 2);
        }
      }, 100)
    }
  }, [])

  const scrollTimeoutRef = useRef(null)

  const isAnimatingRef = useRef(false);

  const handleScroll = () => {
    const el = scrollRef.current
    if (!el || el.children.length === 0) return

    // Determine the center element
    const containerCenter = el.getBoundingClientRect().left + el.clientWidth / 2;
    let closestIndex = 0;
    let minDistance = Infinity;

    Array.from(el.children).forEach((child, index) => {
      const rect = child.getBoundingClientRect();
      const childCenter = rect.left + rect.width / 2;
      const distance = Math.abs(containerCenter - childCenter);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    });

    if (!isAnimatingRef.current) {
      setActiveIndex(prev => prev !== closestIndex ? closestIndex : prev);
    }

    // Silent seamless jump logic when idle
    if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current)
    
    scrollTimeoutRef.current = setTimeout(() => {
      if (!scrollRef.current || isDragging || isAnimatingRef.current) return
      
      const currentEl = scrollRef.current
      const firstChild = currentEl.children[0];
      const setFirstChild = currentEl.children[works.length];
      if (!firstChild || !setFirstChild) return;
      const setWidth = setFirstChild.offsetLeft - firstChild.offsetLeft;

      // Center set is Set 3 (index 2 * works.length to 3 * works.length - 1)
      const centerSetStart = works.length * 2;
      const centerSetEnd = works.length * 3 - 1;

      // If we've scrolled out of the center set, jump back to it silently
      if (closestIndex < centerSetStart || closestIndex > centerSetEnd) {
        const currentSet = Math.floor(closestIndex / works.length);
        const setOffset = 2 - currentSet; // '2' is the index of Set 3
        
        const wasSnapping = currentEl.style.scrollSnapType;
        currentEl.style.scrollSnapType = 'none'; // Disable snap momentarily
        currentEl.scrollLeft += (setOffset * setWidth); // Silent jump
        
        // Re-enable snap on next frame
        requestAnimationFrame(() => {
          currentEl.style.scrollSnapType = wasSnapping;
        });
      }
    }, 150)
  }

  // Mouse drag-to-scroll logic
  const [isDragging, setIsDragging] = useState(false)
  const [isSnapping, setIsSnapping] = useState(true)
  const snapTimeoutRef = useRef(null)
  
  const [dragged, setDragged] = useState(false)
  const [startX, setStartX] = useState(0)
  const [scrollLeftPos, setScrollLeftPos] = useState(0)

  const onMouseDown = (e) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setIsSnapping(false)
    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current)
    
    setDragged(false)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setScrollLeftPos(scrollRef.current.scrollLeft)
  }

  const onMouseMove = (e) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault() // Prevent text selection
    const x = e.pageX - scrollRef.current.offsetLeft
    const walk = (x - startX) * 1.5 // Scroll speed multiplier
    if (Math.abs(walk) > 10) {
      setDragged(true)
    }
    scrollRef.current.scrollLeft = scrollLeftPos - walk
  }

  const onMouseUpOrLeave = () => {
    if (isDragging) {
      setIsDragging(false)
      
      // Smoothly snap to the active card before re-enabling CSS snap
      if (scrollRef.current && scrollRef.current.children[activeIndex]) {
        isAnimatingRef.current = true;
        scrollRef.current.children[activeIndex].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' })
        setTimeout(() => { isAnimatingRef.current = false; }, 800);
      }
      
      snapTimeoutRef.current = setTimeout(() => {
        setIsSnapping(true)
      }, 600) // Re-enable CSS snap after smooth scroll finishes
    }
  }

  return (
    <div
      id="projects"
      ref={containerRef}
      className="bg-cream"
      style={{ height: '300vh' }}
    >
      <div className="sticky top-0 h-screen overflow-hidden flex flex-col justify-center">
        
        {/* Halftone canvas - first in DOM = paints behind everything, no z-index needed */}
        <ProjectsHalftone containerId="projects" />

        {/* All content - relative + z-[1] ensures it stacks above the canvas */}
        <div className="relative flex flex-col justify-center h-full" style={{ zIndex: 1 }}>

        {/* Header - Tied to timeline scroll */}
        <motion.div 
          className="absolute top-24 left-0 right-0 flex flex-col items-center text-center pointer-events-none"
          style={{ y: headerY }}
        >
          <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase mb-3">
            Projects
          </p>
          <h2 className="font-display text-5xl md:text-7xl text-ink">
            Selected Projects
          </h2>
        </motion.div>

        {/* Native Horizontal Scroll Container */}
        <div className="w-full mt-16 relative">
          <div 
            ref={scrollRef}
            onScroll={handleScroll}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onMouseUp={onMouseUpOrLeave}
            onMouseLeave={onMouseUpOrLeave}
            className={`flex items-center w-full overflow-x-auto custom-scrollbar-hide py-12 ${isSnapping ? 'snap-x snap-mandatory' : ''} ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {infiniteWorks.map((work, i) => {
              const isActive = activeIndex !== -1 && (activeIndex % works.length) === (i % works.length);
              
              // Calculate relative distance mathematically wrapped around the modulo space
              let clampedRel = 99;
              if (activeIndex !== -1) {
                const aMod = activeIndex % works.length;
                const bMod = i % works.length;
                let diff = bMod - aMod;
                const half = Math.floor(works.length / 2);
                if (diff > half) diff -= works.length;
                if (diff < -half) diff += works.length;
                clampedRel = diff;
              }
              const distForStyle = Math.abs(clampedRel);
              
              // Uniform structural width
              const widthClass = 'w-[80vw] md:w-[50vw] lg:w-[40vw] xl:w-[32vw]';

              let translateX = 0;
              let scale = 1;
              if (clampedRel === -1) { translateX = 35; scale = 0.8; }
              else if (clampedRel === 1) { translateX = -35; scale = 0.8; }
              else if (clampedRel <= -2) { translateX = 80; scale = 0.6; }
              else if (clampedRel >= 2) { translateX = -80; scale = 0.6; }
              
              const cardOpacity = distForStyle === 0 ? 1 : distForStyle === 1 ? 0.6 : 0.3;
              const cardShadow = distForStyle === 0 ? '0 20px 60px rgba(0,0,0,0.15)' : 'none';
              
              let zIndexClass = 'z-0';
              if (distForStyle === 0) zIndexClass = 'z-30';
              else if (distForStyle === 1) zIndexClass = 'z-20';
              else if (distForStyle === 2) zIndexClass = 'z-10';

              return (
              <div 
                key={`${work.title}-${i}`} 
                onClick={(e) => {
                  if (dragged) return
                  if (!isActive) {
                    setIsSnapping(false);
                    isAnimatingRef.current = true;
                    setActiveIndex(i);
                    
                    const el = scrollRef.current;
                    const targetLeft = e.currentTarget.offsetLeft - (el.clientWidth / 2) + (e.currentTarget.offsetWidth / 2);
                    el.scrollTo({ left: targetLeft, behavior: 'smooth' });
                    
                    if (snapTimeoutRef.current) clearTimeout(snapTimeoutRef.current);
                    snapTimeoutRef.current = setTimeout(() => {
                      setIsSnapping(true);
                      isAnimatingRef.current = false;
                    }, 800);
                  }
                }}
                className={`relative flex flex-col ${widthClass} shrink-0 px-2 snap-center transition-all duration-500 ${zIndexClass}`}
                style={{ 
                  cursor: isActive ? 'auto' : 'pointer'
                }}
              >
                {/* The visual card (thumbnail only) */}
                <article 
                  className="group relative w-full aspect-video rounded-2xl border border-white/40 select-none overflow-hidden bg-white/40 backdrop-blur-lg flex items-center justify-center transition-all duration-500 shadow-[inset_0_0_20px_rgba(255,255,255,0.5)]"
                  style={{
                    transform: `translateX(${translateX}%) scale(${scale})`,
                    opacity: cardOpacity,
                    boxShadow: cardShadow,
                  }}
                >
                  <span className="font-display text-6xl md:text-7xl lg:text-8xl text-ink/20 group-hover:text-cobalt/40 transition-colors duration-500">
                    {((i % works.length) + 1).toString().padStart(2, '0')}
                  </span>
                  
                  {/* Category tag */}
                  <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-white/50 backdrop-blur-md border border-white/20 font-mono text-[10px] uppercase tracking-wider text-ink/80 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                    {work.tech[0]}
                  </div>
                </article>

                {/* The text content below the card */}
                <div className={`mt-5 px-1 flex justify-between items-start transition-all duration-500 ${isActive ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
                  <div className="flex-1 pr-4">
                    <h3 className="font-sans font-semibold text-lg md:text-xl lg:text-2xl text-ink mb-1 tracking-tight">
                      {work.title}
                    </h3>
                    <p className="font-mono text-ink/50 text-[11px] md:text-xs line-clamp-2">
                      {work.subtitle}
                    </p>
                  </div>
                  
                  <div className="flex gap-3 shrink-0 mt-0.5">
                    {work.github && (
                      <a href={work.github} target="_blank" rel="noopener noreferrer" className="text-ink/50 hover:text-cobalt transition-colors pointer-events-auto" aria-label={`${work.title} on GitHub`}>
                        <GitHubIcon />
                      </a>
                    )}
                    {work.live && (
                      <a href={work.live} target="_blank" rel="noopener noreferrer" className="text-ink/50 hover:text-cobalt transition-colors pointer-events-auto" aria-label={`${work.title} live demo`}>
                        <ExternalIcon />
                      </a>
                    )}
                  </div>
                </div>
              </div>
            )})}
          </div>
        </div>
        
        {/* Progress Indicator */}
        <motion.div 
          className="absolute bottom-24 left-0 right-0 flex justify-center items-center gap-2 md:gap-3 pointer-events-none"
        >
          {works.map((_, index) => {
            const isActive = activeIndex % works.length === index;
            return (
              <div 
                key={`dot-${index}`} 
                className={`rounded-full transition-all duration-500 ${isActive ? 'h-1.5 w-6 md:w-8 bg-cobalt' : 'h-1.5 w-1.5 bg-ink/20'}`}
              />
            )
          })}
        </motion.div>

        {/* All work link */}
        <motion.div 
          className="absolute bottom-12 left-0 right-0 flex justify-center pointer-events-none"
        >
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-cobalt hover:text-cobalt/80 text-sm md:text-base transition-colors inline-flex items-center gap-2 group uppercase tracking-[0.15em] border-b border-cobalt pb-1 pointer-events-auto"
          >
            View all on GitHub
            <span className="group-hover:translate-x-2 transition-transform">→</span>
          </a>
        </motion.div>

        </div>{/* end content wrapper */}
      </div>
    </div>
  )
}
