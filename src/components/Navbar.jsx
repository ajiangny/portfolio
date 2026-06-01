import { useState, useEffect } from 'react'
import { useLenisContext } from '../App'

const navLinks = [
  { label: 'Home',     href: '#hero'     },
  { label: 'About',    href: '#about'    },
  { label: 'Projects', href: '#projects' },
  { label: 'Gallery',  href: '#gallery'  },
  { label: 'Contact',  href: '#contact'  },
]

export default function Navbar() {
  const [scrolled, setScrolled]   = useState(false)
  const [menuOpen, setMenuOpen]   = useState(false)
  const [activeSection, setActive] = useState('hero')
  const lenisRef = useLenisContext()

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 30)
      const sections = navLinks.map(l => l.href.slice(1))
      for (let i = sections.length - 1; i >= 0; i--) {
        const el = document.getElementById(sections[i])
        if (el && window.scrollY >= el.offsetTop - 120) {
          setActive(sections[i])
          break
        }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const scrollTo = (e, href) => {
    e.preventDefault()
    lenisRef?.current?.scrollTo(href, { offset: 0, duration: 1.2 })
    setMenuOpen(false)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 border-b-2 border-ink ${
        scrolled
          ? 'bg-cream shadow-md'
          : 'bg-cream'
      }`}
    >
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#hero"
          onClick={(e) => scrollTo(e, '#hero')}
          className="font-display text-2xl text-cobalt select-none tracking-wide"
        >
          PORTFOLIO
        </a>

        {/* Links (Forced Visible) */}
        <ul className="flex items-center gap-4 md:gap-8 flex-wrap justify-end">
          {navLinks.map(({ label, href }) => {
            const id = href.slice(1)
            const active = activeSection === id
            return (
              <li key={label}>
                <a
                  href={href}
                  onClick={(e) => scrollTo(e, href)}
                  className={`font-sans text-sm font-semibold uppercase tracking-[0.15em] transition-colors duration-200 ${
                    active
                      ? 'text-cobalt border-b-2 border-cobalt pb-0.5'
                      : 'text-text-light hover:text-cobalt'
                  }`}
                >
                  {label}
                </a>
              </li>
            )
          })}
        </ul>
      </div>

    </nav>
  )
}
