/**
 * Contact.jsx — Contact Section
 *
 * The final section of the portfolio. Features:
 *   • "Let's Talk" heading with elastic letter repulsion
 *   • Contact form (name, email, message) with a simulated submit
 *   • Social links (GitHub, LinkedIn, X)
 *   • Staggered entrance animations via Framer Motion variants
 *   • GalleryHalftone background (fixed position, shared grid with Gallery)
 *   • SectionNav floating navigation bar
 */
import { useRef, useState } from 'react'
import { motion, useScroll, useTransform } from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import ElasticHeading from './hero/ElasticHeading'
import SectionNav from './SectionNav'
import GalleryHalftone from './gallery/GalleryHalftone'

// Footer navigation — mirrors SectionNav's targets and scroll offsets
const FOOTER_LINKS = [
  { id: 'hero',     label: 'Home' },
  { id: 'about',    label: 'About' },
  { id: 'projects', label: 'Projects' },
  { id: 'gallery',  label: 'Gallery' },
  { id: 'contact',  label: 'Contact' },
]


const CONTACT_EMAIL = 'andrewjiang74@gmail.com'

// TODO: replace LinkedIn/X hrefs with real profile URLs
const socials = [
  {
    label: 'GitHub',
    href: 'https://github.com/ajiangny',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/in/ajiangnyc/',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
]

// Staggered fade+rise variants
const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.12, delayChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 32 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 260, damping: 28 },
  },
}

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle')
  const { navigate: transitionNavigate } = useTransitionContext()

  const sectionRef = useRef(null)

  const footerNavigate = (id, e) => {
    if (id === 'about')         transitionNavigate('#about', { offset: window.innerHeight * 3.6 }, e, 'rgb(27, 58, 140)')
    else if (id === 'projects') transitionNavigate('#projects', { offset: window.innerHeight }, e, 'rgb(245, 240, 232)')
    else if (id === 'contact')  transitionNavigate('#contact', {}, e, 'rgb(245, 240, 232)')
    else if (id === 'gallery')  transitionNavigate('#gallery', {}, e, 'rgb(0, 0, 0)')
    else                        transitionNavigate('#hero', {}, e, 'rgb(27, 58, 140)')
  }

  // Drive SectionNav entry — same pattern as Projects
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'start 0.4'],
  })
  const labelY = useTransform(scrollYProgress, [0, 1], [60, 0])
  const labelOpacity = useTransform(scrollYProgress, [0, 1], [0, 1])

  // Halftone: fixed layer, only visible when Contact is in the viewport
  // Starts fading in as Contact's top enters the bottom of the viewport,
  // and fades out as Contact's bottom leaves the top.
  const { scrollYProgress: halftoneProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  })
  const halftoneOpacity = useTransform(halftoneProgress, [0, 0.04, 0.96, 1], [0, 1, 1, 0])

  const handle = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  // No backend — hand the message off to the visitor's email client.
  const submit = (e) => {
    e.preventDefault()
    const subject = encodeURIComponent(`Portfolio contact from ${form.name}`)
    const body = encodeURIComponent(`${form.message}\n\n— ${form.name} (${form.email})`)
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`
    setStatus('sent')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div
      id="contact"
      ref={sectionRef}
      className="relative overflow-hidden" style={{ backgroundColor: '#000' }}
    >
      {/* Halftone: position:fixed so it shares the same coordinate space
          as Gallery's fixed halftone — grid is perfectly continuous.
          Opacity gates it to only when Contact is in the viewport. */}
      <motion.div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1,
          pointerEvents: 'none',
          opacity: halftoneOpacity,
        }}
      >
        <GalleryHalftone />
      </motion.div>

      {/* SectionNav — absolute, fully isolated, guaranteed on top */}
      <div
        className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-auto"
        style={{ zIndex: 50 }}
      >
        <SectionNav
          currentSection="Contact"
          style={{ y: labelY, opacity: labelOpacity }}
          defaultTextColor="rgba(245,240,232,0.4)"
        />
      </div>

      {/* ── Main content — pointer-events-none on wrapper, re-enabled on children ── */}
      <div
        className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-14 md:py-24 pointer-events-none"
        style={{ zIndex: 2 }}
      >
        {/* Heading — in flow so it stays attached to the form at any viewport height */}
        <motion.div
          className="flex flex-col items-center text-center pointer-events-auto mb-8"
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.05 }}
        >
          <ElasticHeading
            text="Let's Talk."
            as="h2"
            className="font-display text-cream leading-[0.9]"
            style={{ fontSize: 'clamp(48px, 7vw, 96px)' }}
          />
        </motion.div>

        <motion.div
          className="w-full max-w-2xl"
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {/* Tagline */}
          <motion.p
            variants={itemVariants}
            className="font-mono text-cream/60 text-sm leading-[1.9] text-center mb-8 pointer-events-none"
          >
            Have a project in mind, want to collaborate, or just say hi?<br />
            I'd love to hear from you.
          </motion.p>

          {/* Form */}
          <motion.div variants={itemVariants} className="pointer-events-auto">
            {status === 'sent' ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-14 border border-white/10 bg-white/5 rounded-2xl shadow-sm"
              >
                <div className="w-14 h-14 rounded-full bg-cream/10 border border-white/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-display text-2xl text-cream mb-2">Almost there!</p>
                <p className="font-mono text-cream/70 text-xs mb-6 px-6">
                  Your email app should have opened with your message ready to send.<br />
                  If it didn't, email me directly at{' '}
                  <a href={`mailto:${CONTACT_EMAIL}`} className="underline hover:text-cream transition-colors">{CONTACT_EMAIL}</a>.
                </p>
                <button
                  onClick={() => setStatus('idle')}
                  className="font-mono text-cream/50 hover:text-cream text-xs transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Send another →
                </button>
              </motion.div>
            ) : (
              <form onSubmit={submit} className="space-y-5">
                <div className="grid sm:grid-cols-2 gap-5">
                  <div>
                    <label htmlFor="contact-name" className="font-sans text-cream/70 text-[10px] uppercase tracking-[0.2em] block mb-2 font-bold ml-1">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={handle}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-cream font-mono text-sm placeholder-cream/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="font-sans text-cream/70 text-[10px] uppercase tracking-[0.2em] block mb-2 font-bold ml-1">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={handle}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-cream font-mono text-sm placeholder-cream/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="font-sans text-cream/70 text-[10px] uppercase tracking-[0.2em] block mb-2 font-bold ml-1">
                    Message
                  </label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    placeholder="Tell me about your project or idea..."
                    value={form.message}
                    onChange={handle}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-cream font-mono text-sm placeholder-cream/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors resize-none"
                  />
                </div>

                <button
                  id="contact-submit"
                  type="submit"
                  className="relative group flex items-center justify-center border border-[#f5f0e826] bg-white/5 transition-all duration-300 hover:bg-white/75 hover:border-[#f5f0e866] hover:-translate-y-1 cursor-pointer w-full rounded-2xl py-5 mt-2"
                >
                  <span className="relative z-10 font-sans font-bold text-sm tracking-[0.2em] uppercase text-[rgba(255,255,255,0.75)] transition-colors duration-300 group-hover:text-cobalt">
                    Send Message
                  </span>
                </button>
              </form>
            )}
          </motion.div>

          {/* Socials — inside the contact section, below the form */}
          <motion.div variants={itemVariants} className="mt-10 pointer-events-none">
            <div className="flex items-center gap-6 justify-center mb-6">
              <div className="flex-1 h-px bg-cream/10" />
              <span className="font-mono text-cream/40 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">or find me on</span>
              <div className="flex-1 h-px bg-cream/10" />
            </div>
            <div className="flex justify-center gap-5 pointer-events-auto">
              {socials.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-10 h-10 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-cream/70 hover:text-cobalt hover:bg-white/90 hover:border-white/90 transition-all duration-300 hover:-translate-y-1"
                >
                  {icon}
                </a>
              ))}
            </div>
          </motion.div>

        </motion.div>
      </div>

      {/* ── Footer — nav links + signature ─────────────────────────────── */}
      <footer
        className="relative border-t border-white/10 px-6 py-10"
        style={{ zIndex: 2 }}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-7">
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-7 gap-y-3">
            {FOOTER_LINKS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={(e) => footerNavigate(id, e)}
                className="font-sans font-bold text-[11px] tracking-[0.22em] uppercase text-cream/45 hover:text-cream transition-colors duration-300 cursor-pointer"
              >
                {label}
              </button>
            ))}
          </nav>

          <p className="text-center font-mono text-cream/25 text-[10px] tracking-[0.3em] uppercase">
            Andrew Jiang {new Date().getFullYear()} Portfolio
          </p>
        </div>
      </footer>
    </div>
  )
}
