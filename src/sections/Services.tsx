import { AnimatePresence, motion, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { EASE, Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { SymbolBadge } from '../components/SymbolBadge';
import company, { imageAlt, images } from '../lib/company';
import { telHref } from '../lib/links';
import { useRequest } from '../lib/request';
import { spotlightHandler } from '../lib/useSpotlight';
import type { Service } from '../types';

const pad = (n: number) => String(n).padStart(2, '0');

function ServiceItem({ s, i, total, onActive }: { s: Service; i: number; total: number; onActive: (i: number) => void }) {
  const ref = useRef<HTMLLIElement>(null);
  const inView = useInView(ref, { amount: 0.55 });
  const { request } = useRequest();
  useEffect(() => {
    if (inView) onActive(i);
  }, [inView, i, onActive]);

  return (
    <li ref={ref} className="flex lg:min-h-[78vh] lg:items-center">
      <Reveal className="w-full">
        <article
          onPointerMove={spotlightHandler}
          className="spotlight hairline relative overflow-hidden rounded-[1.75rem] bg-ink-2 lg:rounded-none lg:bg-transparent lg:before:hidden lg:after:hidden"
        >
          {/* Bild nur mobil – am Desktop übernimmt die Sticky-Bühne */}
          <div className="relative aspect-[16/11] overflow-hidden lg:hidden">
            <img src={images[s.image]} alt={imageAlt[s.image]} loading="lazy" decoding="async" width={1600} height={1200} className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-2 via-transparent to-transparent" />
            <SymbolBadge className="absolute right-4 top-4" />
          </div>
          <div className="relative p-6 sm:p-8 lg:p-0">
            <div className="flex items-center gap-4">
              <span className="glass grid h-14 w-14 place-items-center rounded-2xl text-accent">
                <Icon name={s.icon} className="h-6 w-6" />
              </span>
              <span className="eyebrow text-mute">
                <span className="text-fg">{pad(i + 1)}</span> / {pad(total)} · {s.kicker}
              </span>
            </div>
            <h3 className="font-semiwide mt-8 text-[2.1rem] font-bold leading-[1.02] tracking-[-0.03em] sm:text-5xl lg:text-[3.6rem]">
              {s.title}
            </h3>
            <p className="mt-5 max-w-[32rem] text-pretty text-[1.05rem] leading-relaxed text-fg-2">{s.text}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button onClick={() => request(s.title)} icon="arrow">
                Service anfragen
              </Button>
            </div>
          </div>
        </article>
      </Reveal>
    </li>
  );
}

export function Services() {
  const [active, setActive] = useState(0);
  const services = company.services;
  const current = services[Math.min(active, services.length - 1)];

  return (
    <section id="leistungen" aria-labelledby="leistungen-title" className="relative bg-ink py-28 sm:py-36 lg:py-44">
      <div className="container-x">
        <SectionHeading
          id="leistungen-title"
          index="01"
          label="Leistungen"
          title="Leistungen, klar benannt."
          accentWords={['benannt.']}
          intro={
            <>
              Hier sehen Sie, wofür {company.name} steht. Was genau an Ihrem Fahrzeug zu tun ist, besprechen Sie am besten
              direkt am Telefon.
            </>
          }
        />

        <div className="mt-16 grid gap-6 lg:mt-20 lg:grid-cols-12 lg:gap-20">
          {/* Sticky-Bühne (Desktop) */}
          <div className="hidden lg:col-span-6 lg:block">
            <div className="sticky top-[calc(var(--header-h)+2.5rem)] h-[calc(100vh-var(--header-h)-5rem)] max-h-[860px]">
              <div className="hairline relative h-full overflow-hidden rounded-[2rem] bg-ink-3">
                <AnimatePresence initial={false}>
                  <motion.img
                    key={current.id}
                    src={images[current.image]}
                    alt={imageAlt[current.image]}
                    loading="lazy"
                    decoding="async"
                    width={1600}
                    height={1200}
                    initial={{ opacity: 0, scale: 1.12 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.04 }}
                    transition={{ duration: 1.2, ease: EASE }}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </AnimatePresence>
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgb(7_8_10/0.55),transparent_30%,transparent_60%,rgb(7_8_10/0.9))]" />
                <div className="absolute inset-x-0 top-0 flex items-center justify-between p-7">
                  <span className="eyebrow text-fg-2">
                    <span className="text-accent">{pad(active + 1)}</span> / {pad(services.length)}
                  </span>
                  <SymbolBadge />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-7">
                  <div className="flex gap-2">
                    {services.map((s, i) => (
                      <span key={s.id} className="relative h-[2px] flex-1 overflow-hidden rounded bg-white/15">
                        <motion.span
                          className="absolute inset-0 origin-left bg-accent"
                          animate={{ scaleX: i <= active ? 1 : 0 }}
                          transition={{ duration: 0.9, ease: EASE }}
                        />
                      </span>
                    ))}
                  </div>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={current.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.6, ease: EASE }}
                      className="font-semiwide mt-5 text-2xl font-bold tracking-[-0.02em]"
                    >
                      {current.title}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>
            </div>
          </div>

          <ol className="flex flex-col gap-6 lg:col-span-6 lg:gap-0">
            {services.map((s, i) => (
              <ServiceItem key={s.id} s={s} i={i} total={services.length} onActive={setActive} />
            ))}
            <li className="lg:flex lg:min-h-[52vh] lg:items-center">
              <Reveal className="w-full">
                <div className="hairline relative overflow-hidden rounded-[1.75rem] bg-[linear-gradient(135deg,color-mix(in_oklab,var(--color-accent)_14%,var(--color-ink-2)),var(--color-ink-2)_60%)] p-7 sm:p-9">
                  <p className="eyebrow text-accent">Ihr Anliegen fehlt?</p>
                  <p className="font-semiwide mt-4 text-2xl font-bold leading-tight tracking-[-0.02em] sm:text-3xl">
                    Ein kurzer Anruf klärt, was möglich ist.
                  </p>
                  <p className="mt-4 max-w-md text-fg-2">
                    Beschreiben Sie einfach, worum es geht – dann wissen Sie in wenigen Minuten, wie es weitergeht.
                  </p>
                  <div className="mt-7">
                    <Button href={telHref(company)} variant="ghost" iconLeft="phone">
                      {company.phone.display}
                    </Button>
                  </div>
                </div>
              </Reveal>
            </li>
          </ol>
        </div>
      </div>
    </section>
  );
}
