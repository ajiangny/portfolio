/**
 * Contact.jsx — Contact Section
 *
 * The final section of the portfolio. Features:
 *   • "Let's Talk" heading with elastic letter repulsion
 *   • Contact form (name, email, message) — no backend; submit opens the
 *     visitor's email client via a prefilled mailto: link
 *   • Social links (GitHub, LinkedIn)
 *   • Staggered entrance animations via Framer Motion variants
 *   • Background-transparent — the site-wide fluid gradient (dark) shows through
 *   • Navigation handled by the global SiteHeader
 */
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { useTransitionContext } from '../context/TransitionContext'
import { SECTIONS, goToSection } from '../config/sections'
import ElasticHeading from './hero/ElasticHeading'

const CONTACT_EMAIL = 'andrewjiang74@gmail.com'

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

  // Curtain colour + landing offset come from config/sections.js
  const footerNavigate = (id, e) => goToSection(transitionNavigate, id, e)

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
      className="relative overflow-hidden" style={{ backgroundColor: 'transparent' }}
    >

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
            style={{ fontSize: 'var(--text-section)' }}
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
            className="font-mono text-cream/60 text-body text-center mb-8 pointer-events-none"
          >
            Have a project in mind, want to collaborate, or just say hi?<br />
            I'd love to hear from you.
          </motion.p>

          {/* Form */}
          <motion.div variants={itemVariants} className="pointer-events-auto">
            {status === 'sent' ? (
              <motion.div
                role="status"
                aria-live="polite"
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-14 border border-white/10 bg-white/5 rounded-2xl shadow-sm"
              >
                <div className="w-14 h-14 rounded-full bg-cream/10 border border-white/20 flex items-center justify-center mx-auto mb-5">
                  <svg className="w-7 h-7 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-display text-title text-cream mb-2">Almost there!</p>
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
                    <label htmlFor="contact-name" className="font-sans text-cream/70 text-label uppercase tracking-[0.2em] block mb-2 font-bold ml-1">
                      Name
                    </label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Jane Doe"
                      value={form.name}
                      onChange={handle}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-cream font-mono text-sm placeholder-cream/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="font-sans text-cream/70 text-label uppercase tracking-[0.2em] block mb-2 font-bold ml-1">
                      Email
                    </label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      required
                      placeholder="jane@example.com"
                      value={form.email}
                      onChange={handle}
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-cream font-mono text-sm placeholder-cream/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-message" className="font-sans text-cream/70 text-label uppercase tracking-[0.2em] block mb-2 font-bold ml-1">
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


        </motion.div>
      </div>

      {/* ── Footer — nav links + signature ─────────────────────────────── */}
      <footer
        className="relative border-t border-white/10 px-6 py-10"
        style={{ zIndex: 2 }}
      >
        <div className="max-w-3xl mx-auto flex flex-col items-center gap-7">
          <nav aria-label="Footer navigation" className="flex flex-wrap justify-center gap-x-3 gap-y-1">
            {SECTIONS.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={(e) => footerNavigate(id, e)}
                className="font-sans font-bold text-label tracking-[0.22em] uppercase text-cream/45 hover:text-cream transition-colors duration-300 cursor-pointer inline-flex items-center min-h-[44px] px-2"
              >
                {label}
              </button>
            ))}
          </nav>

          <p className="text-center font-mono text-cream/25 text-meta tracking-[0.3em] uppercase">
            Andrew Jiang {new Date().getFullYear()} Portfolio
          </p>
        </div>
      </footer>
    </div>
  )
}
