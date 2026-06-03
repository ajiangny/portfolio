import useLenis from './hooks/useLenis'
import { LenisContext } from './context/LenisContext'
import { TransitionProvider } from './context/TransitionContext'
import PageTransition     from './components/PageTransition'
import Hero             from './components/Hero'
import About            from './components/About'
import Projects         from './components/Projects'
import Gallery          from './components/Gallery'
import Contact          from './components/Contact'
import AnimateIn        from './components/AnimateIn'

function App() {
  const lenisRef = useLenis()

  return (
    <LenisContext.Provider value={lenisRef}>
      <TransitionProvider>
        <div className="bg-cream text-ink min-h-screen overflow-x-clip">
          <PageTransition />
          <main>
            <Hero />
            <About />
            <Projects />
            <Gallery />
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
      </TransitionProvider>
    </LenisContext.Provider>
  )
}

export default App
