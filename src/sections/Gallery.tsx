import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { SymbolBadge } from '../components/SymbolBadge';
import company, { imageAlt, images } from '../lib/company';
import { cityLine, directionsUrl } from '../lib/links';

/**
 * Horizontale Galerie: am Desktop an den vertikalen Scroll gekoppelt (Sticky +
 * translateX), mobil als native Wisch-Galerie mit Snap.
 */
export function Gallery() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [desktop, setDesktop] = useState(false);
  const [distance, setDistance] = useState(0);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    const measure = () => {
      setDesktop(mq.matches);
      if (track.current) setDistance(Math.max(0, track.current.scrollWidth - window.innerWidth));
    };
    measure();
    mq.addEventListener('change', measure);
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener('resize', measure);
    return () => {
      mq.removeEventListener('change', measure);
      ro.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, []);

  const { scrollYProgress } = useScroll({ target: section, offset: ['start start', 'end end'] });
  const x = useTransform(scrollYProgress, (v) => (desktop ? -v * distance : 0));
  const bar = useTransform(scrollYProgress, [0, 1], [0, 1]);

  const items = company.gallery;
  const intro = company.symbolicImages
    ? 'Bremse, Rad, Motor, Werkzeug: Bauteile, um die es in der Kfz-Werkstatt geht – als 3D-Visualisierung inszeniert.'
    : `Einblicke in die Werkstatt von ${company.name}.`;

  return (
    <section
      ref={section}
      id="werkstatt"
      aria-labelledby="werkstatt-title"
      className="relative bg-ink"
      style={desktop ? { height: `calc(100vh + ${distance}px)` } : undefined}
    >
      <div className={desktop ? 'sticky top-0 flex h-screen flex-col justify-center overflow-hidden' : 'py-28 sm:py-36'}>
        <div className="container-x">
          <SectionHeading
            id="werkstatt-title"
            index="04"
            label="Einblicke"
            title="Technik im Detail."
            accentWords={['Detail.']}
            intro={intro}
          />
        </div>

        <motion.div
          ref={track}
          style={{ x }}
          className={`mt-12 flex gap-4 px-[var(--gutter)] sm:gap-6 lg:mt-14 ${
            desktop ? 'w-max will-change-transform' : 'no-scrollbar snap-x snap-mandatory overflow-x-auto pb-4'
          }`}
        >
          {items.map((g, i) => (
            <figure
              key={g.image + i}
              className="group relative w-[84vw] shrink-0 snap-start sm:w-[62vw] lg:w-[min(46vw,760px)]"
            >
              <div className="hairline relative aspect-[4/3] overflow-hidden rounded-[1.75rem] bg-ink-3">
                <img
                  src={images[g.image]}
                  alt={imageAlt[g.image]}
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={1200}
                  className="h-full w-full object-cover transition-transform duration-[1.6s] ease-[var(--ease-expo)] group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
                <SymbolBadge className="absolute right-4 top-4" />
                <span className="font-wide absolute bottom-3 left-5 text-[4.5rem] font-black leading-none tracking-[-0.06em] text-white/10 sm:text-[6rem]">
                  {String(i + 1).padStart(2, '0')}
                </span>
              </div>
              <figcaption className="mt-5 flex items-start justify-between gap-6 px-1">
                <div>
                  <p className="font-semiwide text-xl font-bold tracking-[-0.02em]">{g.title}</p>
                  <p className="mt-1 text-mute">{g.caption}</p>
                </div>
                <span className="eyebrow mt-1.5 shrink-0 text-mute">
                  {String(i + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
                </span>
              </figcaption>
            </figure>
          ))}

          {/* Abschluss: Weg zur Werkstatt */}
          <div className="relative w-[84vw] shrink-0 snap-start sm:w-[62vw] lg:w-[min(38vw,620px)]">
            <div className="hairline relative flex aspect-[4/3] flex-col justify-between overflow-hidden rounded-[1.75rem] bg-[radial-gradient(90%_80%_at_100%_100%,color-mix(in_oklab,var(--color-accent)_30%,transparent),transparent_60%),var(--color-ink-2)] p-7 sm:p-9">
              <span className="eyebrow text-accent">Vor Ort</span>
              <div>
                <p className="font-semiwide text-3xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-4xl">
                  Der Weg zur
                  <br />
                  Werkstatt.
                </p>
                <p className="mt-4 text-fg-2">
                  {company.address.street}
                  <br />
                  {cityLine(company)}
                </p>
                <div className="mt-7">
                  <Button href={directionsUrl(company)} external icon="arrow-up-right">
                    Route planen
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {desktop && (
          <Reveal className="container-x mt-10">
            <div className="relative h-px w-full bg-line">
              <motion.div style={{ scaleX: bar }} className="absolute inset-0 origin-left bg-accent" />
            </div>
          </Reveal>
        )}
      </div>
    </section>
  );
}
