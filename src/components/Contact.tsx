/**
 * Contact.tsx — Contact Section (riot style)
 *
 * The close of the site, built as a bookend to Hero: the same cobalt field,
 * ink slash and full-bleed wordmark at the bottom (same component, same
 * per-letter repulsion), with DogPet roaming the floor in front of it.
 * Above it, the call to action on the tilted axis: a SlashHeading statement,
 * the email as a big cream slab button (costume change on hover), and the
 * socials as ransomed tags. Background-transparent — the site-wide fluid
 * background shows through.
 */
import InkReveal from './InkDissolve'
import HeroWordmark from './hero/HeroWordmark'
import DogPet from './about/DogPet'
import SlashHeading from './style/SlashHeading'
import { SOCIALS } from '../data/aboutData'
import { RIOT, TILT, jagged, jaggedPx } from '../style/riot'

const CONTACT_EMAIL = 'andrewjiang74@gmail.com'

export default function Contact() {
  return (
    <div
      id="contact"
      className="relative overflow-hidden flex min-h-screen flex-col"
      style={{ backgroundColor: 'transparent' }}
    >
      {/* ── Call to action — centred in the space above the wordmark ── */}
      <div className="relative flex flex-1 items-center justify-center px-6 pt-28 pb-10" style={{ zIndex: 2 }}>
        <div className="flex flex-col items-center gap-10 md:gap-12" style={{ rotate: `${TILT}deg` }}>
          <SlashHeading
            text="Let's build something"
            seed={9}
            shadow={RIOT.face}
            style={{ fontSize: 'clamp(1.9rem, 5.6vw, 5.25rem)', rotate: '0deg' }}
          />

          <InkReveal margin="0px" delay={0.1} duration={1.2}>
            <div className="flex flex-col items-center gap-3">
              <span className="font-mono uppercase text-label tracking-[0.2em] text-cream">Mail me for collaboration</span>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="font-display bg-cream text-slab px-6 py-4 transition-[background-color,color,rotate,scale] duration-200 ease-[cubic-bezier(0.2,1.4,0.4,1)] hover:bg-slab hover:text-cream hover:-rotate-3 hover:scale-105"
                style={{ fontSize: 'clamp(1rem, 2.6vw, 2.1rem)', lineHeight: 1, clipPath: jagged(41, 4), filter: 'drop-shadow(6px 6px 0 #0F1016)' }}
              >
                {CONTACT_EMAIL}
              </a>
            </div>
          </InkReveal>

          <InkReveal margin="0px" delay={0.18} duration={1.2}>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <span className="font-mono uppercase text-label tracking-[0.2em] text-cream mr-1">Connect on</span>
              {SOCIALS.map((s, i) => (
                <a
                  key={s.label}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  className="font-sans font-bold uppercase text-label tracking-[0.18em] px-3 py-2 transition-[background-color,color,rotate] duration-150 hover:bg-cream hover:text-slab hover:rotate-0"
                  style={{
                    background: i % 2 ? RIOT.face : RIOT.ink,
                    color: i % 2 ? RIOT.ink : RIOT.face,
                    rotate: `${i % 2 ? 4 : -3}deg`,
                    clipPath: jagged(50 + i, 8),
                  }}
                >
                  {s.label}
                </a>
              ))}
            </div>
          </InkReveal>
        </div>
      </div>

      {/* ── Signature wordmark on an ink slash (Hero's bookend). Height is
          independent of the SVG's own thin aspect ratio (esp. on mobile) so
          DogPet's floor lines up with the letter baseline instead of the dog
          floating above/clipping out of a too-short box. */}
      <div className="relative w-full" style={{ height: 'clamp(140px, 20vw, 260px)', zIndex: 2 }}>
        <div
          aria-hidden
          className="absolute pointer-events-none"
          style={{
            left: '-12%',
            width: '124%',
            bottom: '-7vw',
            height: '19vw',
            rotate: '3deg',
            background: RIOT.ink,
            clipPath: jaggedPx(8, 18),
          }}
        />
        <div className="absolute inset-x-0 bottom-0" style={{ color: '#ffffff' }}>
          <HeroWordmark className="block w-full select-none" />
        </div>
        <DogPet spawnDrop />
      </div>
    </div>
  )
}
