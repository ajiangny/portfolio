/**
 * App.jsx — Root Application Component
 *
 * Composes the full single-page portfolio by stacking five
 * scroll-driven sections: Hero → About → Projects → Gallery → Contact.
 *
 * Wraps everything in:
 *   • LenisContext  — smooth-scroll instance shared across sections
 *   • TransitionProvider — blob-expand page-transition state
 */
import useLenis from './hooks/useLenis'
import { LenisContext } from './context/LenisContext'
import { TransitionProvider } from './context/TransitionContext'
import PageTransition from './components/PageTransition'
import Hero from './components/Hero'
import About from './components/About'
import Projects from './components/Projects'
import Gallery from './components/Gallery'
import Contact from './components/Contact'

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
        </div>
      </TransitionProvider>
    </LenisContext.Provider>
  )
}

export default App
