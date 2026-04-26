export default function Hero() {
  const scrollTo = (href) =>
    document.querySelector(href)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <section
      id="hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden bg-cream"
    >
      {/* Dot pattern overlay */}
      <div className="hero-dots absolute inset-0 pointer-events-none" />

      {/* Content */}
      <div className="relative z-10 text-center px-6 max-w-5xl mx-auto">
        <p className="font-sans text-sm font-semibold tracking-[0.3em] uppercase text-cobalt mb-8">
          Graphic Design &amp; Illustration
        </p>

        <h1
          className="font-display text-cobalt leading-[0.95] mb-8"
          style={{ fontSize: 'clamp(4rem, 14vw, 11rem)' }}
        >
          PORT
          <br />
          FOLIO
        </h1>

        <p className="font-mono text-text text-sm md:text-base max-w-lg mx-auto mb-4 leading-relaxed">
          A passionate <span className="font-bold text-ink">developer</span> and{' '}
          <span className="font-bold text-ink">artist</span> crafting digital
          experiences that blend code &amp; creativity.
        </p>

        <p className="font-mono text-text-light text-xs mb-14 tracking-wide">
          Based in New York · Open to opportunities
        </p>

        <div className="flex gap-4 justify-center flex-wrap">
          <button
            id="hero-view-projects"
            onClick={() => scrollTo('#projects')}
            className="btn-primary"
          >
            View Projects
          </button>
          <button
            id="hero-view-art"
            onClick={() => scrollTo('#gallery')}
            className="btn-outline"
          >
            View Art
          </button>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
        <span className="font-mono text-[10px] text-text-light tracking-[0.3em] uppercase">Scroll</span>
        <svg className="w-5 h-5 text-cobalt scroll-arrow" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 14l-7 7m0 0l-7-7m7 7V3" />
        </svg>
      </div>

      {/* Bottom border */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-ink" />
    </section>
  )
}
