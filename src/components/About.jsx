import AnimateIn from './AnimateIn'

const skills = [
  'React', 'JavaScript', 'TypeScript', 'Node.js',
  'Python', 'CSS / Tailwind', 'Figma', 'Git',
  'REST APIs', 'SQL', 'Three.js', 'Framer Motion',
]

export default function About() {
  return (
    <section
      id="about"
      className="relative flex flex-col"
      style={{ background: 'var(--color-cobalt)' }}
    >
      {/* Main content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-16 min-h-screen">
        <div className="max-w-6xl mx-auto w-full">

          {/* Section header */}
          <AnimateIn direction="up">
            <div className="mb-10">
              <p className="font-mono text-xs tracking-[0.3em] uppercase mb-2"
                style={{ color: 'rgba(245,240,232,0.5)' }}>
                // 01 — About
              </p>
              <h2 className="font-display text-5xl md:text-7xl"
                style={{ color: 'var(--color-cream)' }}>
                Hello!
              </h2>
            </div>
          </AnimateIn>

          <div className="grid md:grid-cols-5 gap-10 items-center">

            {/* Bio — 3 cols */}
            <AnimateIn direction="left" delay={0.15} className="md:col-span-3">
              <p className="font-mono text-sm leading-[1.9] mb-4"
                style={{ color: 'rgba(245,240,232,0.75)' }}>
                &ldquo;A developer and artist based in New York, passionate about building
                beautiful, functional digital experiences. Whether it&rsquo;s writing clean
                code or creating visual art, I love the process of bringing ideas to
                life.&rdquo;
              </p>
              <p className="font-mono text-sm leading-[1.9] mb-8"
                style={{ color: 'rgba(245,240,232,0.65)' }}>
                When I&rsquo;m not coding, you&rsquo;ll find me working on digital illustrations,
                exploring new art styles, or experimenting at the intersection of
                creative technology and design.
              </p>

              <p className="font-sans font-bold text-xs uppercase tracking-[0.2em] mb-3"
                style={{ color: 'rgba(245,240,232,0.5)' }}>
                Tech Stack &amp; Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="skill-chip-dark">
                    {skill}
                  </span>
                ))}
              </div>
            </AnimateIn>

            {/* Stamp + stats — 2 cols */}
            <AnimateIn direction="right" delay={0.3} className="md:col-span-2">
              <div className="flex flex-col items-center gap-6">

                {/* Rotating stamp */}
                <div className="stamp stamp-light w-40 h-40 md:w-48 md:h-48">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <defs>
                      <path id="circlePath" d="M 100,100 m -70,0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
                    </defs>
                    <text style={{ fontSize: '14px', fontFamily: "'Space Mono', monospace", letterSpacing: '5px', textTransform: 'uppercase', fill: '#F5F0E8' }}>
                      <textPath href="#circlePath">
                        ★ Developer ★ Artist ★ Creative
                      </textPath>
                    </text>
                    <text x="100" y="95" textAnchor="middle"
                      style={{ fontSize: '28px', fontFamily: "'Abril Fatface', serif", fill: '#F5F0E8' }}>
                      A.O.
                    </text>
                    <text x="100" y="115" textAnchor="middle"
                      style={{ fontSize: '9px', fontFamily: "'Space Mono', monospace", letterSpacing: '2px', textTransform: 'uppercase', fill: 'rgba(245,240,232,0.6)' }}>
                      Est. 2024
                    </text>
                  </svg>
                </div>

                {/* Quick stats */}
                <div className="grid grid-cols-3 gap-6 w-full p-5"
                  style={{ border: '1.5px solid rgba(245,240,232,0.2)' }}>
                  {[
                    { value: '3+', label: 'Years' },
                    { value: '10+', label: 'Projects' },
                    { value: '∞',  label: 'Art' },
                  ].map(({ value, label }) => (
                    <div key={label} className="text-center">
                      <p className="font-display text-3xl"
                        style={{ color: 'var(--color-cream)' }}>{value}</p>
                      <p className="font-mono text-[10px] uppercase tracking-widest mt-1"
                        style={{ color: 'rgba(245,240,232,0.45)' }}>{label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </AnimateIn>
          </div>
        </div>
      </div>
    </section>
  )
}
