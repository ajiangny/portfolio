import ProjectCard from './projects/ProjectCard'
import InkReveal from './InkDissolve'
import { works } from '../data/projectsData'
import SlashHeading from './style/SlashHeading'
import { useEffect, useRef } from 'react'
import { setAccent } from '../style/accent'

// A thin band across the middle of the viewport: whatever card crosses it
// is "the one being viewed".
const CENTRE_BAND = '-45% 0px -45% 0px'

export default function Projects() {
  const sectionRef = useRef<HTMLElement | null>(null)
  const cardRefs = useRef<(HTMLDivElement | null)[]>([])

  // Colour coding: the card in the centre band sets the site accent; the
  // gaps between cards keep the last one, and leaving the section restores
  // cobalt.
  useEffect(() => {
    const cards = new IntersectionObserver((entries) => {
      for (const en of entries) {
        if (!en.isIntersecting) continue
        const i = cardRefs.current.indexOf(en.target as HTMLDivElement)
        setAccent(works[i]?.accent ?? null)
      }
    }, { rootMargin: CENTRE_BAND })
    const section = new IntersectionObserver(([en]) => {
      if (!en.isIntersecting) setAccent(null)
    }, { rootMargin: CENTRE_BAND })
    cardRefs.current.forEach((el) => el && cards.observe(el))
    if (sectionRef.current) section.observe(sectionRef.current)
    return () => { cards.disconnect(); section.disconnect(); setAccent(null) }
  }, [])

  return (
    <section
      ref={sectionRef}
      id="projects"
      style={{ marginTop: '-2px' }}
      className="pt-24 pb-32 md:pt-32 md:pb-40"
    >
      {/* ── Section opener — the riot SlashHeading (tilted ink slab, ransomed
          initials, cobalt hard shadow; slams in on its own). ── */}
      <header className="bg-transparent max-w-[2200px] mx-auto px-8 md:px-16 mb-16 md:mb-24">
        <SlashHeading text="Selected Projects" seed={3} style={{ fontSize: 'var(--text-section)' }} />
      </header>

      {/* Work list — each card hidden until it scrolls into view, then
          ink-dissolves in with its own InkReveal. */}
      <div className="flex flex-col gap-24 lg:gap-40 max-w-[2200px] mx-auto px-5 md:px-10">
        {works.map((work, i) => (
          <div key={work.title ?? `card-${i}`} ref={(el) => { cardRefs.current[i] = el }}>
            <InkReveal>
              <ProjectCard work={work} index={i} />
            </InkReveal>
          </div>
        ))}
      </div>


    </section>
  )
}
