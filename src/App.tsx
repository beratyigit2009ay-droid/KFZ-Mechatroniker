import { MotionConfig, motion, useScroll, useSpring } from 'motion/react';
import { useEffect } from 'react';
import { Safe } from './components/Safe';
import { RequestProvider } from './lib/request';
import { initSmoothScroll } from './lib/scroll';
import { About } from './sections/About';
import { Contact } from './sections/Contact';
import { FAQ } from './sections/FAQ';
import { Footer } from './sections/Footer';
import { Gallery } from './sections/Gallery';
import { Hero } from './sections/Hero';
import { LegalSheet } from './sections/LegalSheet';
import { Marquee } from './sections/Marquee';
import { MobileDock } from './sections/MobileDock';
import { Nav } from './sections/Nav';
import { Process } from './sections/Process';
import { Reviews } from './sections/Reviews';
import { Services } from './sections/Services';
import { VehicleCheck } from './sections/VehicleCheck';
import { Why } from './sections/Why';

declare global {
  interface Window {
    __appReady?: boolean;
  }
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 30, mass: 0.3 });
  return <motion.div aria-hidden style={{ scaleX }} className="fixed inset-x-0 top-0 z-[55] h-[2px] origin-left bg-accent" />;
}

export default function App() {
  useEffect(() => {
    // App läuft → Notfall-Einblendung aus index.html wieder zurücknehmen
    window.__appReady = true;
    document.documentElement.classList.remove('reveal-all');
    return initSmoothScroll();
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <RequestProvider>
        <a
          href="#main"
          className="fixed left-4 top-4 z-[100] -translate-y-24 rounded-full bg-accent px-5 py-3 text-accent-ink transition-transform focus:translate-y-0"
        >
          Zum Inhalt springen
        </a>
        <Safe>
          <ScrollProgress />
        </Safe>
        <Safe>
          <Nav />
        </Safe>
        <main id="main">
          <Safe>
            <Hero />
          </Safe>
          <Safe>
            <Marquee />
          </Safe>
          <Safe>
            <Services />
          </Safe>
          <Safe>
            <Why />
          </Safe>
          <Safe>
            <About />
          </Safe>
          <Safe>
            <Gallery />
          </Safe>
          <Safe>
            <VehicleCheck />
          </Safe>
          <Safe>
            <Reviews />
          </Safe>
          <Safe>
            <Process />
          </Safe>
          <Safe>
            <FAQ />
          </Safe>
          <Safe>
            <Contact />
          </Safe>
        </main>
        <Safe>
          <Footer />
        </Safe>
        <Safe>
          <MobileDock />
        </Safe>
        <Safe>
          <LegalSheet />
        </Safe>
        <div aria-hidden className="grain" />
      </RequestProvider>
    </MotionConfig>
  );
}
