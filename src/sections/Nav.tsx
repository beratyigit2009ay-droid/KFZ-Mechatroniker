import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { useEffect, useState } from 'react';
import { BrandMark } from '../components/BrandMark';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { OpenStatus } from '../components/OpenStatus';
import { EASE } from '../components/Reveal';
import { Stars } from '../components/Stars';
import company from '../lib/company';
import { cityLine, directionsUrl, formatRating, telHref } from '../lib/links';
import { scrollToTarget, stopScroll } from '../lib/scroll';

export const NAV_LINKS = [
  { href: '#leistungen', label: 'Leistungen' },
  { href: '#ueber-uns', label: 'Über uns' },
  { href: '#werkstatt', label: 'Einblicke' },
  { href: '#bewertungen', label: 'Bewertungen' },
  { href: '#termin', label: 'Termin' },
  { href: '#kontakt', label: 'Kontakt' },
];

function go(e: React.MouseEvent<HTMLAnchorElement>, href: string, closeMenu?: () => void) {
  e.preventDefault();
  if (closeMenu) {
    // Menü schließen und Scrollen sofort wieder freigeben, dann springen
    stopScroll(false);
    closeMenu();
  }
  scrollToTarget(href);
  history.replaceState(null, '', href);
}

export function Nav() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, 'change', (v) => {
    const prev = scrollY.getPrevious() ?? 0;
    setScrolled(v > 24);
    setHidden(v > prev && v > 480);
  });

  useEffect(() => {
    stopScroll(open);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: hidden && !open ? -110 : 0, opacity: 1 }}
        transition={{ duration: 0.7, ease: EASE }}
        className="fixed inset-x-0 top-0 z-50"
      >
        <div
          className={`transition-[background,border-color,backdrop-filter] duration-500 ${
            scrolled && !open
              ? 'border-b border-line bg-ink/65 backdrop-blur-xl backdrop-saturate-150'
              : 'border-b border-transparent'
          }`}
        >
          <nav aria-label="Hauptnavigation" className="container-x flex h-[var(--header-h)] items-center justify-between gap-6">
            <a href="#top" onClick={(e) => go(e, '#top')} aria-label={`${company.name} – zum Seitenanfang`} className="relative z-[70] min-w-0">
              <BrandMark />
            </a>

            <ul className="hidden items-center gap-1 lg:flex">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => go(e, l.href)}
                    className="group relative rounded-full px-3.5 py-2 text-[0.92rem] text-fg-2 transition-colors hover:text-fg xl:px-4"
                  >
                    {l.label}
                    <span className="absolute inset-x-4 bottom-1 h-px origin-left scale-x-0 bg-accent transition-transform duration-500 ease-[var(--ease-expo)] group-hover:scale-x-100" />
                  </a>
                </li>
              ))}
            </ul>

            <div className="flex items-center gap-3">
              <a
                href="#bewertungen"
                onClick={(e) => go(e, '#bewertungen')}
                className="glass hidden items-center gap-2 rounded-full px-3.5 py-2 text-sm 2xl:inline-flex"
              >
                <Stars value={company.rating.value} className="h-3.5 w-3.5" animate={false} />
                <span className="font-semibold">{formatRating(company.rating.value)}</span>
                <span className="text-mute">Google</span>
              </a>
              <span className="hidden sm:block">
                <Button href={telHref(company)} iconLeft="phone" ariaLabel={`Jetzt anrufen: ${company.phone.display}`}>
                  Jetzt anrufen
                </Button>
              </span>
              <a
                href={telHref(company)}
                aria-label={`Jetzt anrufen: ${company.phone.display}`}
                className="relative z-[70] grid h-12 w-12 place-items-center rounded-full bg-accent text-accent-ink shadow-[0_10px_30px_-8px_var(--color-accent)] sm:hidden"
              >
                <Icon name="phone" className="h-5 w-5" />
              </a>
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                aria-controls="mobile-menu"
                aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
                className="glass relative z-[70] grid h-12 w-12 place-items-center rounded-full lg:hidden"
              >
                <span className="relative block h-3 w-5">
                  <span
                    className={`absolute left-0 h-[1.5px] w-5 rounded bg-fg transition-all duration-500 ease-[var(--ease-expo)] ${open ? 'top-1/2 -translate-y-1/2 rotate-45' : 'top-0'}`}
                  />
                  <span
                    className={`absolute left-0 h-[1.5px] w-5 rounded bg-fg transition-all duration-500 ease-[var(--ease-expo)] ${open ? 'top-1/2 -translate-y-1/2 -rotate-45' : 'top-full -translate-y-full'}`}
                  />
                </span>
              </button>
            </div>
          </nav>
        </div>
      </motion.header>

      {/* ── Mobiles Vollbild-Menü ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            id="mobile-menu"
            role="dialog"
            aria-modal="true"
            aria-label="Menü"
            initial={{ clipPath: 'circle(0% at calc(100% - 44px) 38px)' }}
            animate={{ clipPath: 'circle(150% at calc(100% - 44px) 38px)' }}
            exit={{ clipPath: 'circle(0% at calc(100% - 44px) 38px)' }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[65] flex flex-col overflow-y-auto bg-ink-2 lg:hidden"
          >
            <div aria-hidden className="tech-grid pointer-events-none absolute inset-0 opacity-60 [mask-image:linear-gradient(to_bottom,#000,transparent)]" />
            <div className="container-x relative flex flex-1 flex-col pb-10 pt-[calc(var(--header-h)+2rem)]">
              <ul className="flex flex-col">
                {NAV_LINKS.map((l, i) => (
                  <motion.li
                    key={l.href}
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, ease: EASE, delay: 0.15 + i * 0.05 }}
                    className="border-b border-line"
                  >
                    <a
                      href={l.href}
                      onClick={(e) => go(e, l.href, () => setOpen(false))}
                      className="flex items-center justify-between py-4 font-semiwide text-[2rem] font-bold tracking-[-0.03em]"
                    >
                      {l.label}
                      <span className="eyebrow text-[0.62rem] text-mute">0{i + 1}</span>
                    </a>
                  </motion.li>
                ))}
              </ul>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, ease: EASE, delay: 0.5 }}
                className="mt-auto flex flex-col gap-3 pt-10"
              >
                <Button href={telHref(company)} size="lg" iconLeft="phone" className="w-full">
                  {company.phone.display}
                </Button>
                <Button href={directionsUrl(company)} external size="lg" variant="ghost" iconLeft="route" className="w-full">
                  Route planen
                </Button>
                <div className="mt-4 flex flex-col gap-2 text-sm text-mute">
                  <span className="flex items-center gap-2">
                    <Icon name="pin" className="h-4 w-4" />
                    {company.address.street}, {cityLine(company)}
                  </span>
                  <OpenStatus />
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
