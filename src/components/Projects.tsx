import ProjectCard from './projects/ProjectCard'
import InkReveal from './InkDissolve'
import { works } from '../data/projectsData'
import SlashHeading from './style/SlashHeading'

export default function Projects() {
  return (
    <section
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
          <InkReveal key={work.title ?? `card-${i}`}>
            <ProjectCard work={work} index={i} />
          </InkReveal>
        ))}
      </div>


    </section>
  )
}
