import { createContext, useContext } from 'react'
import useLenis from './hooks/useLenis'
import Hero             from './components/Hero'
import ArtworkTransition from './components/ArtworkTransition'
import About            from './components/About'
import Projects         from './components/Projects'
import ArtGallery       from './components/ArtGallery'
import Contact          from './components/Contact'
import AnimateIn        from './components/AnimateIn'

export const LenisContext = createContext(null)
export const useLenisContext = () => useContext(LenisContext)

function App() {
  const lenisRef = useLenis()

  return (
    <LenisContext.Provider value={lenisRef}>
      <div className="bg-cream text-ink min-h-screen overflow-x-clip">
        <main>
          <Hero />
          <ArtworkTransition />
          <About />
          <Projects />
          <ArtGallery />
          <Contact />
        </main>
        <footer className="border-t-2 border-ink py-8 text-center bg-cream">
          <AnimateIn direction="up">
            <p className="font-mono text-text-light text-[11px] uppercase tracking-[0.2em]">
              © {new Date().getFullYear()} Your Name · Built with React &amp; Tailwind CSS
            </p>
          </AnimateIn>
        </footer>
      </div>
    </LenisContext.Provider>
  )
}

export default App
