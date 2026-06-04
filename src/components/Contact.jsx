import { useRef, useEffect, useState } from 'react'
import { motion, useTransform, useSpring } from 'framer-motion'
import useScrollTimeline from '../hooks/useScrollTimeline'

const socials = [
  {
    label: 'GitHub',
    href: 'https://github.com',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23A11.509 11.509 0 0112 5.803c1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576C20.566 21.797 24 17.3 24 12c0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  {
    label: 'LinkedIn',
    href: 'https://linkedin.com',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
      </svg>
    ),
  },
  {
    label: 'Twitter / X',
    href: 'https://x.com',
    icon: (
      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
]

export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', message: '' })
  const [status, setStatus] = useState('idle')

  const containerRef = useRef(null)
  const [activeHeight, setActiveHeight] = useState(0)
  
  useEffect(() => {
    setActiveHeight(window.innerHeight)
  }, [])
  
  const rawProgress = useScrollTimeline(containerRef, activeHeight)
  const progress = useSpring(rawProgress, { stiffness: 400, damping: 40 })

  // Cinematic Assembly Transforms
  const headerY = useTransform(progress, [0, 0.6], ['-30vh', '0vh'])
  const headerOpacity = useTransform(progress, [0, 0.5], [0, 1])
  
  const formY = useTransform(progress, [0.2, 0.8], ['30vh', '0vh'])
  const formOpacity = useTransform(progress, [0.2, 0.7], [0, 1])
  const formScale = useTransform(progress, [0.2, 0.8], [0.9, 1])

  const socialOpacity = useTransform(progress, [0.5, 1], [0, 1])
  const socialScale = useTransform(progress, [0.5, 1], [0.8, 1])

  const handle = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }))

  const submit = async (e) => {
    e.preventDefault()
    setStatus('sending')
    console.log('Form submitted:', form)
    await new Promise((r) => setTimeout(r, 1000))
    setStatus('sent')
    setForm({ name: '', email: '', message: '' })
  }

  return (
    <div
      id="contact"
      ref={containerRef}
      className="bg-cobalt"
      style={{ height: '200vh' }}
    >
      <div className="sticky top-0 h-screen w-full overflow-hidden flex flex-col items-center justify-center px-6">
        
        {/* Section Label (Screen Relative) */}
        <div className="absolute top-8 left-1/2 -translate-x-1/2 pointer-events-none z-20">
          <motion.p 
            className="font-sans text-cream/40 text-sm font-semibold tracking-[0.28em] uppercase whitespace-nowrap"
            style={{ y: headerY, opacity: headerOpacity }}
          >
            Contact
          </motion.p>
        </div>

        <div className="max-w-2xl w-full relative">

          {/* Header */}
          <motion.div 
            className="mb-14 flex flex-col items-center text-center w-full"
            style={{ y: headerY, opacity: headerOpacity }}
          >
            <h2 className="font-display text-[clamp(40px,6vw,80px)] leading-[0.95] text-cream mb-6">
              Thank You for Visiting!
            </h2>
            <p className="font-mono text-cream/70 text-sm leading-[1.9] max-w-md mx-auto">
              Have a project in mind, want to collaborate, or just want to say hi?
              I'd love to hear from you.
            </p>
          </motion.div>

          {/* Form */}
          <motion.div 
            style={{ y: formY, opacity: formOpacity, scale: formScale }}
            className="w-full"
          >
            {status === 'sent' ? (
              <div className="text-center py-12 border border-white/10 bg-white/5 rounded-2xl shadow-sm backdrop-blur-sm">
                <div className="w-14 h-14 rounded-full bg-cream/10 border border-white/20 flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-cream" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <p className="font-display text-2xl text-cream mb-2">Sent!</p>
                <p className="font-mono text-cream/70 text-xs mb-6">Thanks for reaching out. I'll get back to you soon.</p>
                <button
                  onClick={() => setStatus('idle')}
                  className="font-mono text-cream/50 hover:text-cream text-xs transition-colors uppercase tracking-widest cursor-pointer"
                >
                  Send another →
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
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
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-4 text-cream font-mono text-sm placeholder-cream/30 focus:outline-none focus:border-white/30 focus:bg-white/10 transition-colors resize-none custom-scrollbar"
                  />
                </div>

                <button
                  id="contact-submit"
                  type="submit"
                  disabled={status === 'sending'}
                  className="relative group flex items-center justify-center border border-[#f5f0e826] bg-white/5 transition-all duration-300 hover:bg-white/75 hover:border-[#f5f0e866] hover:-translate-y-1 cursor-pointer w-full rounded-2xl py-5 mt-6 disabled:opacity-50 disabled:pointer-events-none"
                >
                  <span className="relative z-10 font-sans font-bold text-sm tracking-[0.2em] uppercase text-[rgba(255,255,255,0.75)] transition-colors duration-300 group-hover:text-cobalt">
                    {status === 'sending' ? 'Sending...' : 'Send Message'}
                  </span>
                </button>
              </form>
            )}
          </motion.div>

          {/* Social links */}
          <motion.div 
            style={{ opacity: socialOpacity, scale: socialScale }}
          >
            <div className="mt-16 flex items-center gap-6 justify-center">
              <div className="flex-1 h-[1px] bg-cream/10" />
              <span className="font-mono text-cream/40 text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">or find me on</span>
              <div className="flex-1 h-[1px] bg-cream/10" />
            </div>

            <div className="flex justify-center gap-5 mt-8 pointer-events-auto">
              {socials.map(({ label, href, icon }) => (
                <a
                  key={label}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={label}
                  className="w-11 h-11 rounded-full border border-white/10 bg-white/5 flex items-center justify-center text-cream/70 hover:text-cobalt hover:bg-white/90 hover:border-white/90 transition-all duration-300 hover:-translate-y-1"
                >
                  {icon}
                </a>
              ))}
            </div>
          </motion.div>

        </div>
      </div>
    </div>
  )
}
