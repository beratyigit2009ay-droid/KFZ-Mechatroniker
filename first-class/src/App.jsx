import Footer from './components/Footer.jsx'
import Header from './components/Header.jsx'
import KeyIntro from './components/KeyIntro.jsx'
import MobileCallBar from './components/MobileCallBar.jsx'
import { serviceBySlug } from './content.js'
import { PageContext } from './context.js'
import HomePage from './pages/HomePage.jsx'
import LegalPage from './pages/LegalPage.jsx'
import ServicePage from './pages/ServicePage.jsx'
import useReveal from './useReveal.js'

function PageContent({ page }) {
  if (serviceBySlug[page]) return <ServicePage slug={page} />
  if (page === 'impressum' || page === 'datenschutz') return <LegalPage kind={page} />
  return <HomePage />
}

export default function App({ page = 'home' }) {
  useReveal()
  return (
    <PageContext.Provider value={page}>
      {page === 'home' && <KeyIntro />}
      <a
        href="#inhalt"
        className="sr-only z-[60] rounded-full bg-gold-400 px-5 py-3 text-sm font-semibold text-ink-950 focus:not-sr-only focus:fixed focus:top-4 focus:left-4"
      >
        Zum Inhalt springen
      </a>
      <Header />
      <main id="inhalt" tabIndex={-1} className="outline-none">
        <PageContent page={page} />
      </main>
      <Footer />
      <MobileCallBar />
    </PageContext.Provider>
  )
}
