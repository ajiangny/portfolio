import { useState } from 'react'
import AnimateIn from './AnimateIn'

const artworks = [
  { id: 1, title: 'Cosmic Nebula',    medium: 'Digital Art',          src: '/art/art1.png' },
  { id: 2, title: 'Crystal Geometry', medium: 'Digital Illustration', src: '/art/art2.png' },
  { id: 3, title: 'Portrait Study',   medium: 'Digital Painting',     src: '/art/art3.png' },
  { id: 4, title: 'Floating Worlds',  medium: 'Concept Art',          src: '/art/art4.png' },
]

export default function ArtGallery() {
  const [selected, setSelected] = useState(null)
  const close = () => setSelected(null)

  return (
    <section
      id="gallery"
      className="min-h-screen flex flex-col border-t-2 border-ink bg-cream"
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-6xl mx-auto w-full">
          {/* Header */}
          <AnimateIn direction="up">
            <div className="mb-8">
              <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase mb-2">
                // 03 — Creative Work
              </p>
              <h2 className="font-display text-5xl md:text-7xl text-ink">
                Gallery
              </h2>
              <p className="font-mono text-text-light text-xs mt-3 max-w-md leading-[1.8]">
                A collection of digital artworks — click any piece to view it full size.
              </p>
            </div>
          </AnimateIn>

          {/* Gallery grid — fixed row height to fit viewport */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3" style={{ gridTemplateRows: 'repeat(2, 200px)' }}>
            {artworks.map((art, i) => (
              <AnimateIn
                key={art.id}
                direction="up"
                delay={i * 0.1}
                className={i === 0 ? 'lg:col-span-2 row-span-2' : ''}
                style={i === 0 ? { gridRow: 'span 2' } : undefined}
              >
                <div
                  id={`gallery-item-${art.id}`}
                  className="gallery-card h-full"
                  onClick={() => setSelected(art)}
                >
                  <img
                    src={art.src}
                    alt={art.title}
                    className="w-full h-full object-cover"
                  />
                  <div className="gallery-overlay">
                    <div>
                      <p className="font-sans text-cream font-bold text-sm uppercase tracking-wide">{art.title}</p>
                      <p className="font-mono text-cream/70 text-[10px] mt-0.5 uppercase tracking-wider">{art.medium}</p>
                    </div>
                  </div>
                </div>
              </AnimateIn>
            ))}
          </div>

          <AnimateIn direction="up" delay={0.5}>
            <p className="font-mono text-text-light text-[11px] text-center mt-4 tracking-wide">
              Replace placeholders with your own artwork in{' '}
              <code className="text-cobalt bg-cobalt-pale px-1.5 py-0.5 text-[10px]">/public/art/</code>
            </p>
          </AnimateIn>
        </div>
      </div>

      {/* Lightbox */}
      {selected && (
        <div
          className="lightbox"
          role="dialog"
          aria-modal="true"
          aria-label={selected.title}
          onClick={close}
        >
          <div
            className="relative max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={selected.src}
              alt={selected.title}
              className="w-full border-2 border-cream/20"
            />
            <div className="mt-4 flex items-center justify-between px-1">
              <div>
                <p className="font-sans text-cream font-bold text-lg uppercase tracking-wide">{selected.title}</p>
                <p className="font-mono text-cream/60 text-xs uppercase tracking-wider">{selected.medium}</p>
              </div>
              <button
                id="lightbox-close"
                onClick={close}
                className="text-cream/60 hover:text-cream transition-colors font-mono text-xs uppercase tracking-widest flex items-center gap-2"
              >
                Close ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
