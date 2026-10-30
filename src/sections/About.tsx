import { motion, useScroll, useTransform } from 'motion/react';
import { useRef } from 'react';
import { Reveal, RevealText } from '../components/Reveal';
import { SymbolBadge } from '../components/SymbolBadge';
import company, { imageAlt, images } from '../lib/company';
import { summarizeHours } from '../lib/hours';
import { cityLine, formatRating, telHref } from '../lib/links';

export function About() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start end', 'end start'] });
  const imgY = useTransform(scrollYProgress, [0, 1], ['-8%', '8%']);

  const rows: { label: string; value: React.ReactNode }[] = [
    { label: 'Betrieb', value: company.name },
    ...(company.owner ? [{ label: 'Inhaber', value: company.owner }] : []),
    { label: 'Branche', value: company.industry.replaceAll(' / ', ' · ') },
    { label: 'Standort', value: `${company.address.street}, ${cityLine(company)}` },
    {
      label: 'Telefon',
      value: (
        <a href={telHref(company)} className="underline decoration-paper-ink/25 underline-offset-4 hover:decoration-accent">
          {company.phone.display}
        </a>
      ),
    },
    {
      label: 'Google',
      value: `${formatRating(company.rating.value)} / 5 · ${company.rating.count} Bewertungen (Stand ${company.rating.asOf})`,
    },
    {
      label: 'Öffnungszeiten',
      value: company.hours
        ? summarizeHours(company.hours)
            .map((g) => `${g.days} ${g.times}`)
            .join(' · ')
        : 'Telefonisch erfragen',
    },
  ];

  return (
    <section
      ref={ref}
      id="ueber-uns"
      aria-labelledby="about-title"
      className="relative z-10 -mt-10 overflow-hidden rounded-t-[2.5rem] bg-paper py-28 text-paper-ink sm:py-36 lg:rounded-t-[3.5rem] lg:py-44"
    >
      <div className="container-x">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-20">
          {/* Bild */}
          <div className="lg:col-span-5">
            <Reveal>
              <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] bg-ink shadow-[0_40px_80px_-30px_rgb(0_0_0/0.45)]">
                <motion.img
                  style={{ y: imgY, scale: 1.18 }}
                  src={images.tools}
                  alt={imageAlt.tools}
                  loading="lazy"
                  decoding="async"
                  width={1600}
                  height={1200}
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-transparent to-transparent" />
                <SymbolBadge className="absolute right-5 top-5" />
                <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-6 text-fg">
                  <p className="font-semiwide text-xl font-bold leading-tight tracking-[-0.02em]">
                    {company.shortName}
                    <span className="block text-sm font-normal text-fg-2">{company.descriptor}</span>
                  </p>
                  <span className="eyebrow text-[0.6rem] text-fg-2">{company.address.zip}</span>
                </div>
              </div>
            </Reveal>
          </div>

          {/* Text + Datenblatt */}
          <div className="lg:col-span-7">
            <Reveal y={12}>
              <p className="eyebrow flex items-center gap-3 text-paper-mute">
                <span className="inline-flex items-center gap-2 text-paper-ink">
                  <span className="h-1.5 w-1.5 rounded-full bg-accent ring-1 ring-paper-ink/20" />
                  03
                </span>
                <span className="h-px w-10 bg-paper-ink/20" />
                <span>{company.about.kicker}</span>
              </p>
            </Reveal>
            <RevealText id="about-title" text={company.about.title} className="display-md mt-6 text-balance" />
            <div className="mt-8 space-y-5">
              {company.about.text.map((t, i) => (
                <Reveal key={i} delay={0.1 + i * 0.08}>
                  <p className="max-w-2xl text-pretty text-[1.15rem] leading-relaxed text-paper-ink/80 sm:text-[1.3rem]">{t}</p>
                </Reveal>
              ))}
            </div>

            <Reveal delay={0.2} className="mt-14">
              <div className="rounded-[1.75rem] border border-paper-ink/10 bg-white/60 p-6 backdrop-blur sm:p-8">
                <div className="flex items-center justify-between">
                  <p className="font-semiwide text-lg font-bold tracking-[-0.01em]">Datenblatt</p>
                  <span className="eyebrow text-[0.6rem] text-paper-mute">Stand {company.rating.asOf}</span>
                </div>
                <dl className="mt-5">
                  {rows.map((r, i) => (
                    <motion.div
                      key={r.label}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.8, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                      className="grid gap-1 border-t border-paper-ink/10 py-3.5 sm:grid-cols-[10rem_1fr] sm:gap-6"
                    >
                      <dt className="eyebrow pt-0.5 text-[0.64rem] text-paper-mute">{r.label}</dt>
                      <dd className="text-[0.98rem] font-medium">{r.value}</dd>
                    </motion.div>
                  ))}
                </dl>
              </div>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}
