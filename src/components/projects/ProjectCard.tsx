/**
 * ProjectCard.tsx — one work-list row (layout ref: kaiseisadatoki-v4 /work)
 *
 * Desktop: 12-col grid — info sticks in cols 1-5 while the image (cols 8-12,
 * 576/420) scrolls past with a slow parallax (120%-tall image drifts -10%).
 * Mobile: image first, info below.
 * Typography/surfaces follow our own system: cream + mono meta, Instrument
 * Sans titles, glass border/shadow on the image frame.
 */
import { useRef, useState, useEffect, type ReactNode } from 'react'
import { motion, useScroll, useTransform, useMotionValue, animate, useReducedMotion } from 'framer-motion'
import useInkFilter from '../../hooks/useInkFilter'
import type { Work } from '../../data/projectsData'

function WrenchIcon() {
  return (
    <svg
      className="w-10 h-10 text-white/15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
    </svg>
  )
}

// Circle-with-dot launch link (reference's signature CTA, recoloured cream).
export function CircleLink({ href, label, children }: { href: string; label: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="group/link inline-flex items-center gap-4 w-fit"
    >
      <span className="relative block w-11 h-11 md:w-12 md:h-12 rounded-full border border-cream/35 transition-colors duration-300 group-hover/link:border-cream/80">
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-cream transition-transform duration-300 group-hover/link:scale-[1.8]" />
      </span>
      <span
        className="font-mono uppercase tracking-[0.2em] text-cream/80 transition-opacity duration-300 group-hover/link:opacity-50"
        style={{ fontSize: 'var(--text-label)' }}
      >
        {children}
      </span>
    </a>
  )
}

function MetaLabel({ children }: { children: ReactNode }) {
  return (
    <span
      className="block font-mono uppercase tracking-[0.25em] text-cream/40 mb-2"
      style={{ fontSize: 'var(--text-meta)' }}
    >
      {children}
    </span>
  )
}

const TECH_ICON_MAP: Record<string, string> = {
  'TypeScript': 'typescript.svg',
  'Tailwind': 'tailwindcss.svg',
  'Express': 'expressjs.svg',
  'Python': 'python.svg',
  'React': 'react.svg',
  'Three.js': 'threejs.svg',
  'Vercel': 'vercel.svg',
  'JavaScript': 'javascript.svg',
};

function TechIconBadge({ name }: { name: string }) {
  const iconFile = TECH_ICON_MAP[name];

  if (iconFile) {
    return (
      <div
        className="flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5 p-1.5 shrink-0"
        title={name}
      >
        <img src={`/icons/default/${iconFile}`} alt={name} className="w-full h-full object-contain" />
      </div>
    );
  }

  // Fallback placeholder: 2-letter abbreviation
  return (
    <div
      className="flex items-center justify-center w-8 h-8 rounded border border-white/10 bg-white/5 shrink-0"
      title={name}
    >
      <span className="font-mono text-[11px] text-cream/60 font-bold uppercase tracking-tighter">
        {name.substring(0, 2)}
      </span>
    </div>
  );
}

export default function ProjectCard({ work }: { work: Work }) {
  const reduceMotion = useReducedMotion()
  const itemRef = useRef<HTMLElement>(null)

  // Parallax: track this row across the viewport; the 120%-tall image
  // drifts up 10% of its height as the row passes (same ratio as the ref).
  const { scrollYProgress } = useScroll({
    target: itemRef,
    offset: ['start end', 'end start'],
  })
  const imgY = useTransform(scrollYProgress, [0, 1], ['0%', '-10%'])

  const thumbnailSrc = work.thumbnail ?? null
  const hoverSrc = work.hoverThumbnail ?? null
  const [isHovered, setIsHovered] = useState(false)
  // Don't fetch the hover asset (can be a multi-MB gif) until the first
  // hover — it's invisible until then and shouldn't compete at page load.
  const [hasHovered, setHasHovered] = useState(false)

  // Hover crossfade uses the shared ink-dissolve filter (hooks/useInkFilter)
  // instead of a hard image swap, matching the site-wide transition language.
  const inkT = useMotionValue(0)
  const { defs: inkDefs, filter: inkFilter } = useInkFilter(inkT, { maxScale: 40, maxBlur: 8, octaves: 3 })

  useEffect(() => {
    if (!hoverSrc) return
    const controls = animate(inkT, isHovered ? 1 : 0, {
      duration: reduceMotion ? 0.15 : 0.6,
      ease: [0.76, 0, 0.24, 1],
    })
    return () => controls.stop()
  }, [isHovered, hoverSrc, reduceMotion, inkT])

  return (
    <article
      ref={itemRef}
      className="grid grid-cols-1 gap-y-8 lg:grid-cols-12 lg:gap-x-8 p-6 md:p-10"
      style={{
        borderRadius: '22px',
        border: '1px solid rgba(255,255,255,0.18)',
        background: 'rgba(18,22,46,0.40)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        boxShadow: '0 8px 30px rgba(8,12,40,0.18)',
      }}
    >
      {/* ── Image — first on mobile, right column on desktop ── */}
      <div className="lg:col-start-8 lg:col-end-13 lg:row-start-1">
        <div
          className="relative overflow-hidden aspect-576/420 rounded-[16px]"
          onMouseEnter={() => { if (hoverSrc) { setIsHovered(true); setHasHovered(true) } }}
          onMouseLeave={() => setIsHovered(false)}
        >
          {thumbnailSrc ? (
            <>
              <motion.img
                src={thumbnailSrc}
                alt={work.title}
                className="absolute inset-x-0 top-0 w-full h-[120%] object-cover"
                style={reduceMotion ? undefined : { y: imgY }}
                loading="lazy"
                decoding="async"
                draggable="false"
              />
              {hoverSrc && hasHovered && (
                <>
                  {inkDefs}
                  <motion.img
                    src={hoverSrc}
                    alt=""
                    aria-hidden="true"
                    className="absolute inset-x-0 top-0 w-full h-[120%] object-cover"
                    style={{
                      y: reduceMotion ? undefined : imgY,
                      opacity: inkT,
                      filter: reduceMotion ? 'none' : inkFilter,
                    }}
                    draggable="false"
                  />
                </>
              )}
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <WrenchIcon />
            </div>
          )}
        </div>
      </div>

      {/* ── Info — sticky left column on desktop ── */}
      <div className="lg:col-start-1 lg:col-end-6 lg:row-start-1 lg:sticky lg:top-24 lg:self-start max-w-[600px]">


        <h3
          className="font-heading font-semibold uppercase text-cream tracking-tight leading-tight mt-3 mb-4"
          style={{ fontSize: 'clamp(1.75rem, 3.2vw, 3rem)' }}
        >
          {work.title}
        </h3>

        <p
          className="font-mono text-cream/45 leading-relaxed mb-8"
          style={{ fontSize: 'var(--text-body)' }}
        >
          {work.subtitle}
        </p>

        {/* Year / Role / Stack */}
        <div className="flex gap-12 mb-6">
          {work.year && (
            <div>
              <MetaLabel>Year</MetaLabel>
              <p className="font-mono text-cream/80" style={{ fontSize: 'var(--text-body)' }}>
                {work.year}
              </p>
            </div>
          )}
          {work.role && (
            <div>
              <MetaLabel>Role</MetaLabel>
              <p className="font-mono text-cream/80" style={{ fontSize: 'var(--text-body)' }}>
                {work.role}
              </p>
            </div>
          )}
        </div>

        {work.tech.length > 0 && (
          <div className="mb-10">
            <MetaLabel>Stack</MetaLabel>
            <div className="flex flex-wrap gap-2">
              {work.tech.map((t) => (
                <TechIconBadge key={t} name={t} />
              ))}
            </div>
          </div>
        )}

        {work.live && (
          <CircleLink href={work.live} label={`${work.title} live site`}>
            Launch Website
          </CircleLink>
        )}
        {!work.live && work.github && (
          <CircleLink href={work.github} label={`${work.title} on GitHub`}>
            View Code
          </CircleLink>
        )}
      </div>
    </article>
  )
}
