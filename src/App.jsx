import Navbar    from './components/Navbar'
import Hero       from './components/Hero'
import About      from './components/About'
import Projects   from './components/Projects'
import ArtGallery from './components/ArtGallery'
import Contact    from './components/Contact'

function App() {
  return (
    <div className="bg-cream text-ink min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <About />
        <Projects />
        <ArtGallery />
        <Contact />
      </main>
      <footer className="border-t-2 border-ink py-8 text-center bg-cream">
        <p className="font-mono text-text-light text-[11px] uppercase tracking-[0.2em]">
          © {new Date().getFullYear()} Your Name · Built with React &amp; Tailwind CSS
        </p>
      </footer>
    </div>
  )
}

export default App
