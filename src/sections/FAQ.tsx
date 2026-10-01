import { AnimatePresence, motion } from 'motion/react';
import { useId, useState } from 'react';
import { Button } from '../components/Button';
import { EASE, Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import company from '../lib/company';
import { buildFaq } from '../lib/faq';
import { telHref } from '../lib/links';

const faq = buildFaq(company);

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0);
  const uid = useId();

  return (
    <section id="faq" aria-labelledby="faq-title" className="relative bg-ink-2 py-28 sm:py-36 lg:py-44">
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <div className="lg:sticky lg:top-[calc(var(--header-h)+3rem)]">
              <SectionHeading id="faq-title" index="08" label="FAQ" title="Gut zu wissen." accentWords={['wissen.']} />
              <Reveal delay={0.1}>
                <p className="mt-6 max-w-sm text-fg-2">Ihre Frage ist nicht dabei? Am Telefon ist sie schnell beantwortet.</p>
                <div className="mt-7">
                  <Button href={telHref(company)} variant="ghost" iconLeft="phone">
                    {company.phone.display}
                  </Button>
                </div>
              </Reveal>
            </div>
          </div>

          <ul className="lg:col-span-8">
            {faq.map((item, i) => {
              const isOpen = open === i;
              return (
                <Reveal as="li" key={item.q} delay={i * 0.04} className="border-b border-line first:border-t">
                  <h3>
                    <button
                      type="button"
                      id={`${uid}-q-${i}`}
                      aria-expanded={isOpen}
                      aria-controls={`${uid}-a-${i}`}
                      onClick={() => setOpen(isOpen ? null : i)}
                      className="group flex w-full items-center justify-between gap-6 py-6 text-left sm:py-7"
                    >
                      <span className="flex items-baseline gap-5">
                        <span className="eyebrow w-6 shrink-0 text-mute">{String(i + 1).padStart(2, '0')}</span>
                        <span
                          className={`font-semiwide text-lg font-semibold tracking-[-0.01em] transition-colors sm:text-xl ${isOpen ? 'text-fg' : 'text-fg-2 group-hover:text-fg'}`}
                        >
                          {item.q}
                        </span>
                      </span>
                      <span
                        className={`relative grid h-10 w-10 shrink-0 place-items-center rounded-full border transition-all duration-500 ${
                          isOpen ? 'rotate-45 border-accent bg-accent text-accent-ink' : 'border-line text-fg group-hover:border-line-2'
                        }`}
                        aria-hidden
                      >
                        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round">
                          <path d="M12 5v14M5 12h14" />
                        </svg>
                      </span>
                    </button>
                  </h3>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        id={`${uid}-a-${i}`}
                        role="region"
                        aria-labelledby={`${uid}-q-${i}`}
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.6, ease: EASE }}
                        className="overflow-hidden"
                      >
                        <p className="max-w-2xl pb-7 pl-11 text-pretty leading-relaxed text-fg-2">{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Reveal>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
