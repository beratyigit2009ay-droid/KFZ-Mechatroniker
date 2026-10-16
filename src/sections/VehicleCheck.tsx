import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Button } from '../components/Button';
import { CarOutline } from '../components/CarOutline';
import { Icon } from '../components/Icon';
import { EASE, Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { AREAS } from '../lib/areas';
import { useRequest } from '../lib/request';

/** Interaktiver Fahrzeug-Check: Bereich wählen → als Anliegen in die Anfrage übernehmen. */
export function VehicleCheck() {
  const [selected, setSelected] = useState(AREAS[1].id);
  const area = AREAS.find((a) => a.id === selected) ?? AREAS[0];
  const index = AREAS.indexOf(area);
  const { request } = useRequest();

  return (
    <section id="fahrzeug" aria-labelledby="fahrzeug-title" className="relative overflow-hidden bg-ink py-28 sm:py-36 lg:py-44">
      <div aria-hidden className="tech-grid pointer-events-none absolute inset-0 opacity-70 [mask-image:radial-gradient(60%_50%_at_40%_55%,#000,transparent)]" />
      <div className="container-x relative">
        <SectionHeading
          id="fahrzeug-title"
          index="05"
          label="Ihr Fahrzeug"
          title="Wo drückt der Schuh?"
          accentWords={['Schuh?']}
          intro="Wählen Sie den Bereich, der Ihnen Sorgen macht. Ihre Auswahl landet direkt in der Anfrage – so haben Sie beim Anruf alles parat."
        />

        <div className="mt-14 grid gap-6 lg:mt-20 lg:grid-cols-12 lg:gap-8">
          {/* Bühne */}
          <Reveal className="min-w-0 lg:col-span-8">
            <div className="hairline relative overflow-hidden rounded-[2rem] bg-[radial-gradient(70%_60%_at_50%_70%,rgb(255_255_255/0.05),transparent),var(--color-ink-2)] px-3 pb-6 pt-10 sm:px-8 sm:pt-14">
              <div className="flex items-center justify-between px-3 sm:px-0">
                <span className="eyebrow text-mute">Fahrzeug-Check</span>
                <span className="eyebrow text-mute">
                  <span className="text-accent">{String(index + 1).padStart(2, '0')}</span> / {String(AREAS.length).padStart(2, '0')}
                </span>
              </div>
              <div className="relative mx-auto mt-6 w-full max-w-[900px]">
                <div className="relative aspect-[1000/380]">
                  <CarOutline className="absolute inset-0 h-full w-full" />
                  {/* Diagnose-Scan */}
                  <motion.span
                    aria-hidden
                    className="absolute inset-y-[8%] w-px bg-gradient-to-b from-transparent via-accent to-transparent shadow-[0_0_24px_var(--color-accent)]"
                    initial={{ left: '4%', opacity: 0 }}
                    whileInView={{ left: ['4%', '96%'], opacity: [0, 1, 1, 0] }}
                    viewport={{ once: true, amount: 0.6 }}
                    transition={{ duration: 2.4, delay: 1.2, ease: 'easeInOut' }}
                  />
                  {AREAS.map((a) => {
                    const on = a.id === selected;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        tabIndex={-1}
                        aria-hidden
                        onClick={() => setSelected(a.id)}
                        style={{ left: `${a.x}%`, top: `${a.y}%` }}
                        className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 p-3"
                      >
                        <span className="relative grid h-5 w-5 place-items-center">
                          <span className={`absolute inset-0 rounded-full ${on ? 'bg-accent/40' : 'bg-white/25'} animate-pulse-ring`} />
                          <span
                            className={`relative h-3.5 w-3.5 rounded-full border-2 transition-all duration-500 ${
                              on ? 'scale-125 border-accent bg-accent shadow-[0_0_20px_var(--color-accent)]' : 'border-white bg-ink group-hover:border-accent'
                            }`}
                          />
                        </span>
                        <span
                          className={`glass pointer-events-none absolute bottom-full left-1/2 mb-1 hidden -translate-x-1/2 whitespace-nowrap rounded-full px-3 py-1 text-xs transition-all duration-300 sm:block ${
                            on ? 'opacity-100' : 'translate-y-1 opacity-0 group-hover:translate-y-0 group-hover:opacity-100'
                          }`}
                        >
                          {a.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Auswahl – zugängliche Steuerung (auch per Tastatur) */}
              <div role="radiogroup" aria-label="Fahrzeugbereich wählen" className="no-scrollbar -mx-3 mt-6 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:justify-center sm:px-0">
                {AREAS.map((a) => {
                  const on = a.id === selected;
                  return (
                    <button
                      key={a.id}
                      type="button"
                      role="radio"
                      aria-checked={on}
                      onClick={() => setSelected(a.id)}
                      className={`shrink-0 rounded-full border px-4 py-2 text-sm transition-all duration-300 ${
                        on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-white/[0.03] text-fg-2 hover:border-line-2 hover:text-fg'
                      }`}
                    >
                      {a.label}
                    </button>
                  );
                })}
              </div>
            </div>
          </Reveal>

          {/* Detail */}
          <Reveal delay={0.15} className="min-w-0 lg:col-span-4">
            <div className="panel relative flex h-full flex-col rounded-[2rem] p-7 sm:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={area.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -16 }}
                  transition={{ duration: 0.5, ease: EASE }}
                  className="flex flex-1 flex-col"
                >
                  <span className="eyebrow text-accent">Bereich {String(index + 1).padStart(2, '0')}</span>
                  <h3 className="font-semiwide mt-3 text-3xl font-bold tracking-[-0.03em]">{area.label}</h3>
                  <p className="mt-6 text-sm text-mute">Mögliche Anzeichen</p>
                  <ul className="mt-3 space-y-2.5">
                    {area.signs.map((s) => (
                      <li key={s} className="flex items-start gap-3 text-fg-2">
                        <Icon name="check" className="mt-1 h-4 w-4 shrink-0 text-accent" />
                        {s}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-auto pt-8">
                    <Button onClick={() => request(area.label)} icon="arrow" className="w-full">
                      Als Anliegen übernehmen
                    </Button>
                  </div>
                </motion.div>
              </AnimatePresence>
              <p className="mt-5 text-xs leading-relaxed text-mute">
                Allgemeine Anhaltspunkte – keine Diagnose. Was an Ihrem Fahrzeug zu tun ist, klären Sie direkt mit der Werkstatt.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
