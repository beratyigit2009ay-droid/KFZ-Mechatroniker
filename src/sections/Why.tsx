import { motion } from 'motion/react';
import { CountUp } from '../components/CountUp';
import { EASE, Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import company from '../lib/company';
import { spotlightHandler } from '../lib/useSpotlight';
import type { Highlight } from '../types';

const layout = [
  'lg:col-span-5 lg:row-span-2 lg:min-h-[30rem]',
  'lg:col-span-7',
  'lg:col-span-4',
  'lg:col-span-3',
];

function Value({ h, big }: { h: Highlight; big: boolean }) {
  const decimal = /^\d+,\d+$/.test(h.value);
  const numeric = /^\d+$/.test(h.value) && h.countUp;
  const cls = `font-wide font-extrabold leading-[0.9] tracking-[-0.05em] ${big ? 'text-[5.5rem] sm:text-[7rem] xl:text-[8.5rem]' : 'text-[3.4rem] sm:text-[4.2rem]'}`;
  return (
    <p className="flex items-baseline gap-2">
      {decimal ? (
        <CountUp value={parseFloat(h.value.replace(',', '.'))} decimals={1} className={cls} />
      ) : numeric ? (
        <CountUp value={parseInt(h.value, 10)} className={cls} />
      ) : (
        <span className={cls}>{h.value}</span>
      )}
      {h.unit && <span className="font-semiwide text-xl font-semibold text-mute sm:text-2xl">{h.unit}</span>}
    </p>
  );
}

export function Why() {
  return (
    <section id="warum" aria-labelledby="warum-title" className="relative overflow-hidden bg-ink py-28 sm:py-36 lg:py-44">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(50%_40%_at_15%_20%,color-mix(in_oklab,var(--color-accent)_9%,transparent),transparent)]" />
      <div className="container-x relative">
        <SectionHeading
          id="warum-title"
          index="02"
          label={`Warum ${company.shortName}`}
          title="Vertrauen, das man nachlesen kann."
          accentWords={['nachlesen']}
          intro="Keine großen Versprechen – sondern Fakten, die Sie selbst prüfen können: Bewertungen, Standort, Erreichbarkeit."
        />

        <ul className="mt-16 grid gap-4 sm:grid-cols-2 lg:mt-20 lg:grid-cols-12 lg:gap-5">
          {company.highlights.map((h, i) => (
            <Reveal as="li" key={h.label} delay={i * 0.08} className={`${layout[i] ?? 'lg:col-span-4'} ${i === 0 ? 'sm:col-span-2 lg:col-span-5' : ''}`}>
              <div
                onPointerMove={spotlightHandler}
                className={`spotlight hairline group relative flex h-full flex-col justify-between overflow-hidden rounded-[1.75rem] p-7 transition-transform duration-700 ease-[var(--ease-expo)] hover:-translate-y-1 sm:p-8 ${
                  i === 0
                    ? 'bg-[radial-gradient(120%_90%_at_100%_0%,color-mix(in_oklab,var(--color-accent)_22%,transparent),transparent_55%),var(--color-ink-2)]'
                    : 'bg-ink-2'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="eyebrow text-mute">{String(i + 1).padStart(2, '0')}</span>
                  <span className="h-2 w-2 rounded-full bg-accent shadow-[0_0_16px_var(--color-accent)]" />
                </div>
                <div className={i === 0 ? 'mt-16 lg:mt-auto' : 'mt-10'}>
                  <Value h={h} big={i === 0} />
                  <p className="font-semiwide mt-4 text-lg font-bold tracking-[-0.01em]">{h.label}</p>
                  <p className="mt-2 max-w-sm text-pretty text-[0.97rem] leading-relaxed text-mute">{h.text}</p>
                  <span className="relative mt-7 block h-px overflow-hidden bg-line">
                    <motion.span
                      className="absolute inset-0 origin-left bg-accent"
                      initial={{ scaleX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.8, ease: EASE, delay: 0.3 + i * 0.1 }}
                    />
                  </span>
                </div>
              </div>
            </Reveal>
          ))}
        </ul>
      </div>
    </section>
  );
}
