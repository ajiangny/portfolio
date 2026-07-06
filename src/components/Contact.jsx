/**
 * Contact.jsx — Contact Section
 *
 * Minimal close to the site: one row (mail / socials / tagline, each on a
 * single line — stacked on mobile) sitting just above the Hero wordmark,
 * reused full-bleed at the bottom with its same elastic per-letter repulsion
 * and ink-dissolve entrance, just its quiet echo here. DogPet roams the floor
 * in front of it. Background-transparent — the site-wide fluid gradient shows
 * through.
 */
import InkReveal from './InkDissolve'
import HeroWordmark from './hero/HeroWordmark'
import DogPet from './about/DogPet'
import { SOCIALS } from '../data/aboutData'

const CONTACT_EMAIL = 'andrewjiang74@gmail.com'

export default function Contact() {
  return (
    <div
      id="contact"
      className="relative overflow-hidden flex min-h-screen flex-col"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* ── Bottom stack — mail / socials / tagline row, then signature wordmark ── */}
      <div className="relative mt-auto" style={{ zIndex: 2 }}>
        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-start lg:justify-between lg:gap-6 pb-6 md:pb-8 px-6 text-center lg:text-left">
          <InkReveal margin="0px" delay={0.05} duration={1.2} maxScale={30} maxBlur={8} className="font-mono text-cream/70 text-label uppercase tracking-[0.15em] lg:whitespace-nowrap">
            Mail to{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-cream underline underline-offset-2 hover:text-cream/60 transition-colors">
              {CONTACT_EMAIL}
            </a>
            {' '}for collaboration
          </InkReveal>

          <InkReveal margin="0px" delay={0.1} duration={1.2} maxScale={30} maxBlur={8} className="font-mono text-cream/70 text-label uppercase tracking-[0.15em] lg:whitespace-nowrap">
            Let's build something.
          </InkReveal>

          <InkReveal margin="0px" delay={0.15} duration={1.2} maxScale={30} maxBlur={8} className="font-mono text-cream/70 text-label uppercase tracking-[0.15em] lg:whitespace-nowrap lg:text-right">
            Connect on{' '}
            {SOCIALS.map((s, i) => (
              <span key={s.label}>
                <a href={s.href} target="_blank" rel="noreferrer" className="text-cream underline underline-offset-2 hover:text-cream/60 transition-colors">
                  {s.label}
                </a>
                {i < SOCIALS.length - 2 ? ', ' : i === SOCIALS.length - 2 ? ', or ' : ''}
              </span>
            ))}
          </InkReveal>
        </div>

        {/* Wordmark — same component as Hero, full interactivity kept. Height is
            independent of the SVG's own thin aspect ratio (esp. on mobile) so
            DogPet's floor lines up with the letter baseline instead of the dog
            floating above/clipping out of a too-short box. */}
        <div className="relative w-full" style={{ height: 'clamp(140px, 20vw, 260px)' }}>
          <div className="absolute inset-x-0 bottom-0" style={{ color: '#ffffff' }}>
            <HeroWordmark className="block w-full select-none" />
          </div>
          <DogPet spawnDrop />
        </div>
      </div>
    </div>
  )
}
