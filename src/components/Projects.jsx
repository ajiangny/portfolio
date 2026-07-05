import ProjectCard, { CircleLink } from './projects/ProjectCard'
import InkReveal from './InkDissolve'
import { works } from '../data/projectsData'

const projects = works

export default function Projects() {
  return (
    <section
      id="projects"
      style={{ marginTop: '-2px' }}
      className="pt-24 pb-32 md:pt-32 md:pb-40"
    >
      {/* ── Section opener — transparent headline, fluid gradient reads
          through (same treatment as Contact's display type). ── */}
      <InkReveal>
        <header className="bg-transparent max-w-[2200px] mx-auto px-5 md:px-10 mb-12 md:mb-20">
          <h2
            className="font-display text-ink leading-[0.95] tracking-tight"
            style={{ fontSize: 'var(--text-section)' }}
          >
            Selected Projects
          </h2>
        </header>
      </InkReveal>

      {/* Work list — each card hidden until it scrolls into view, then
          ink-dissolves in with its own InkReveal. */}
      <div className="flex flex-col gap-24 lg:gap-40 max-w-[2200px] mx-auto px-5 md:px-10">
        {projects.map((work, i) => (
          <InkReveal key={work.title ?? `card-${i}`}>
            <ProjectCard work={work} index={i} />
          </InkReveal>
        ))}
      </div>


    </section>
  )
}
