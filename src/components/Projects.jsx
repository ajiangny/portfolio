import AnimateIn from './AnimateIn'

const projects = [
  {
    title: 'Project Alpha',
    description:
      'A full-stack web application that solves a real-world problem. Built with a modern React frontend and a scalable Node.js backend.',
    tech: ['React', 'Node.js', 'MongoDB'],
    github: 'https://github.com',
    live: '#',
    num: '01',
  },
  {
    title: 'Project Beta',
    description:
      'A type-safe, performant web experience with server-side rendering and a clean, accessible design system.',
    tech: ['TypeScript', 'Next.js', 'PostgreSQL'],
    github: 'https://github.com',
    live: '#',
    num: '02',
  },
  {
    title: 'Project Gamma',
    description:
      'Data-driven API with real-time analytics, authentication, and a dashboard powered by Python and FastAPI.',
    tech: ['Python', 'FastAPI', 'Supabase'],
    github: 'https://github.com',
    live: '#',
    num: '03',
  },
]

function GitHubIcon() {
  return (
    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
    </svg>
  )
}

function ExternalIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

export default function Projects() {
  return (
    <section
      id="projects"
      className="min-h-screen flex flex-col border-t-2 border-ink bg-cream-light"
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <AnimateIn direction="up">
            <div className="mb-10">
              <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase mb-2">
                // 02 — Work
              </p>
              <h2 className="font-display text-5xl md:text-7xl text-ink">
                Projects
              </h2>
            </div>
          </AnimateIn>

          {/* Cards */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {projects.map((project, i) => (
              <AnimateIn key={project.title} direction="up" delay={i * 0.12}>
                <article className="project-card flex flex-col h-full">
                  {/* Card header */}
                  <div className="p-5 border-b-2 border-ink flex items-center justify-between">
                    <span className="font-display text-4xl text-cobalt">{project.num}</span>
                    <div className="flex gap-3">
                      <a
                        href={project.github}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-light hover:text-cobalt transition-colors"
                        aria-label={`${project.title} on GitHub`}
                      >
                        <GitHubIcon />
                      </a>
                      <a
                        href={project.live}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-light hover:text-cobalt transition-colors"
                        aria-label={`${project.title} live demo`}
                      >
                        <ExternalIcon />
                      </a>
                    </div>
                  </div>

                  {/* Card body */}
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="font-sans text-base font-bold text-ink mb-2 uppercase tracking-wide">
                      {project.title}
                    </h3>
                    <p className="font-mono text-text text-xs leading-[1.8] mb-4 flex-1">
                      {project.description}
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {project.tech.map((t) => (
                        <span
                          key={t}
                          className="text-[10px] px-2 py-1 border border-ink/30 text-text-light font-mono uppercase tracking-wider"
                        >
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
              </AnimateIn>
            ))}
          </div>

          {/* All projects link */}
          <AnimateIn direction="up" delay={0.4}>
            <div className="text-center mt-10">
              <a
                href="https://github.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-mono text-cobalt hover:text-cobalt-dark text-xs transition-colors inline-flex items-center gap-2 group uppercase tracking-[0.15em]"
              >
                View all on GitHub
                <span className="group-hover:translate-x-1 transition-transform">→</span>
              </a>
            </div>
          </AnimateIn>
        </div>
      </div>
    </section>
  )
}
