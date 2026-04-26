import { useState } from 'react'

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
    <section
      id="contact"
      className="min-h-screen flex flex-col border-t-2 border-ink bg-cream-light"
    >
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="max-w-2xl mx-auto w-full">
          {/* Header */}
          <div className="mb-10">
            <p className="font-mono text-cobalt text-xs tracking-[0.3em] uppercase mb-2">
              // 04 — Say Hello
            </p>
            <h2 className="font-display text-5xl md:text-7xl text-ink mb-3">
              Contact
            </h2>
            <p className="font-mono text-text text-xs leading-[1.8]">
              Have a project in mind, want to collaborate, or just want to say hi?
              I'd love to hear from you.
            </p>
          </div>

          {/* Form */}
          {status === 'sent' ? (
            <div className="text-center py-12 border-2 border-ink bg-cream">
              <div className="w-14 h-14 border-2 border-cobalt flex items-center justify-center mx-auto mb-4">
                <svg className="w-7 h-7 text-cobalt" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="font-display text-2xl text-cobalt mb-2">Sent!</p>
              <p className="font-mono text-text text-xs mb-6">Thanks for reaching out. I'll get back to you soon.</p>
              <button
                onClick={() => setStatus('idle')}
                className="font-mono text-cobalt hover:text-cobalt-dark text-xs transition-colors uppercase tracking-widest"
              >
                Send another →
              </button>
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="contact-name" className="font-mono text-ink text-[10px] uppercase tracking-[0.2em] block mb-1.5 font-bold">
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
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="contact-email" className="font-mono text-ink text-[10px] uppercase tracking-[0.2em] block mb-1.5 font-bold">
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
                    className="form-input"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="contact-message" className="font-mono text-ink text-[10px] uppercase tracking-[0.2em] block mb-1.5 font-bold">
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
                  className="form-input resize-none"
                />
              </div>

              <button
                id="contact-submit"
                type="submit"
                disabled={status === 'sending'}
                className="btn-primary w-full justify-center disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {status === 'sending' ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          )}

          {/* Social links */}
          <div className="mt-10 flex items-center gap-6 justify-center">
            <div className="flex-1 h-[1.5px] bg-ink/15" />
            <span className="font-mono text-text-light text-[10px] tracking-[0.2em] uppercase whitespace-nowrap">or find me on</span>
            <div className="flex-1 h-[1.5px] bg-ink/15" />
          </div>

          <div className="flex justify-center gap-4 mt-6">
            {socials.map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="w-11 h-11 border-2 border-ink flex items-center justify-center text-text hover:text-cobalt hover:border-cobalt hover:bg-cobalt-pale transition-all duration-200"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
