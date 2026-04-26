const skills = [
  'React', 'JavaScript', 'TypeScript', 'Node.js',
  'Python', 'CSS / Tailwind', 'Figma', 'Git',
  'REST APIs', 'SQL', 'Three.js', 'Framer Motion',
]

export default function About() {
  return (
    <section
      id="about"
      className="min-h-screen flex flex-col border-t-2 border-ink bg-cream"
    >
      {/* Ticker strip — pinned to top of section */}
      <div className="ticker-strip flex-shrink-0">
        <div className="ticker-inner font-sans text-sm font-semibold tracking-[0.2em] uppercase">
          {Array(3).fill(
            ' ★ Developer ★ Artist ★ Designer ★ Illustrator ★ Creative Coder ★ Problem Solver '
          ).join('')}
        </div>
      </div>

      {/* Vertically centered content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto w-full">
          {/* Section header */}
          <div className="mb-10">
            <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase mb-2">
              // 01 — About
            </p>
            <h2 className="font-display text-5xl md:text-7xl text-ink">
              Hello!
            </h2>
          </div>

          <div className="grid md:grid-cols-5 gap-10 items-center">
            {/* Bio — 3 cols */}
            <div className="md:col-span-3">
              <p className="font-mono text-text text-sm leading-[1.9] mb-4">
                "A developer and artist based in New York, passionate about building
                beautiful, functional digital experiences. Whether it's writing clean
                code or creating visual art, I love the process of bringing ideas to
                life."
              </p>
              <p className="font-mono text-text text-sm leading-[1.9] mb-8">
                When I'm not coding, you'll find me working on digital illustrations,
                exploring new art styles, or experimenting at the intersection of
                creative technology and design.
              </p>

              <p className="font-sans text-ink font-bold text-xs uppercase tracking-[0.2em] mb-3">
                Tech Stack &amp; Skills
              </p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <span key={skill} className="skill-chip">
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Stamp + stats — 2 cols */}
            <div className="md:col-span-2 flex flex-col items-center gap-6">
              {/* Rotating stamp */}
              <div className="stamp w-40 h-40 md:w-48 md:h-48">
                <svg viewBox="0 0 200 200" className="w-full h-full">
                  <defs>
                    <path id="circlePath" d="M 100,100 m -70,0 a 70,70 0 1,1 140,0 a 70,70 0 1,1 -140,0" />
                  </defs>
                  <text className="fill-cobalt" style={{ fontSize: '14px', fontFamily: "'Space Mono', monospace", letterSpacing: '5px', textTransform: 'uppercase' }}>
                    <textPath href="#circlePath">
                      ★ Developer ★ Artist ★ Creative
                    </textPath>
                  </text>
                  <text x="100" y="95" textAnchor="middle" className="fill-cobalt" style={{ fontSize: '28px', fontFamily: "'Abril Fatface', serif" }}>
                    A.O.
                  </text>
                  <text x="100" y="115" textAnchor="middle" className="fill-cobalt" style={{ fontSize: '9px', fontFamily: "'Space Mono', monospace", letterSpacing: '2px', textTransform: 'uppercase' }}>
                    Est. 2024
                  </text>
                </svg>
              </div>

              {/* Quick stats */}
              <div className="grid grid-cols-3 gap-6 w-full border-2 border-ink p-5">
                {[
                  { value: '3+', label: 'Years' },
                  { value: '10+', label: 'Projects' },
                  { value: '∞',  label: 'Art' },
                ].map(({ value, label }) => (
                  <div key={label} className="text-center">
                    <p className="font-display text-3xl text-cobalt">{value}</p>
                    <p className="font-mono text-text-light text-[10px] uppercase tracking-widest mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
