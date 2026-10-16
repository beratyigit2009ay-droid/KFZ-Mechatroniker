import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useState } from 'react';
import { Icon } from '../components/Icon';
import { EASE } from '../components/Reveal';
import company from '../lib/company';
import { directionsUrl, telHref } from '../lib/links';
import { scrollToTarget } from '../lib/scroll';

/**
 * Mobile Aktionsleiste: Anrufen, Termin, Route – immer mit dem Daumen erreichbar.
 * Erscheint, sobald der Hero verlassen wird.
 */
export function MobileDock() {
  const { scrollY } = useScroll();
  const [visible, setVisible] = useState(false);
  useMotionValueEvent(scrollY, 'change', (v) => {
    const doc = document.documentElement;
    const nearEnd = v + window.innerHeight > doc.scrollHeight - 140;
    setVisible(v > window.innerHeight * 0.6 && !nearEnd);
  });

  return (
    <AnimatePresence>
      {visible && (
        <motion.nav
          aria-label="Schnellaktionen"
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ duration: 0.6, ease: EASE }}
          className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-40 md:hidden"
        >
          <div className="glass flex items-center gap-1.5 rounded-[1.4rem] bg-ink/70 p-1.5 shadow-[0_20px_60px_-10px_rgb(0_0_0/0.8)]">
            <a
              href={telHref(company)}
              className="flex h-14 flex-[1.4] items-center justify-center gap-2.5 rounded-[1.05rem] bg-accent font-medium text-accent-ink active:scale-[0.98]"
            >
              <Icon name="phone" className="h-5 w-5" />
              Anrufen
            </a>
            <a
              href="#termin"
              onClick={(e) => {
                e.preventDefault();
                scrollToTarget('#termin');
              }}
              className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.05rem] text-[0.7rem] text-fg-2 active:bg-white/5"
            >
              <Icon name="calendar" className="h-5 w-5" />
              Termin
            </a>
            <a
              href={directionsUrl(company)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-[1.05rem] text-[0.7rem] text-fg-2 active:bg-white/5"
            >
              <Icon name="route" className="h-5 w-5" />
              Route
            </a>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
}
