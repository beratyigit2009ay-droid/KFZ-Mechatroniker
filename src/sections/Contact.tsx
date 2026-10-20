import { motion } from 'motion/react';
import { useEffect, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { OpenStatus } from '../components/OpenStatus';
import { EASE, Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import company from '../lib/company';
import { berlinNow, formatRanges, WEEKDAY_LABEL, WEEKDAYS } from '../lib/hours';
import { cityLine, directionsUrl, mapsEmbedUrl, mapsSearchUrl, telHref } from '../lib/links';
import type { Weekday } from '../types';

function HoursCard() {
  const [today, setToday] = useState<Weekday | null>(null);
  useEffect(() => setToday(berlinNow().day), []);
  return (
    <div className="hairline flex h-full flex-col rounded-[1.75rem] bg-ink-2 p-7 sm:p-8">
      <div className="flex items-center gap-3 text-mute">
        <Icon name="clock" className="h-5 w-5 text-accent" />
        <span className="eyebrow">Öffnungszeiten</span>
      </div>
      {company.hours ? (
        <dl className="mt-6 flex-1">
          {WEEKDAYS.map((d) => {
            const isToday = d === today;
            return (
              <div
                key={d}
                className={`flex items-center justify-between gap-4 border-b border-line py-2.5 text-[0.95rem] last:border-0 ${isToday ? 'text-fg' : 'text-fg-2'}`}
              >
                <dt className="flex items-center gap-2">
                  {isToday && <span className="h-1.5 w-1.5 rounded-full bg-accent" />}
                  {WEEKDAY_LABEL[d]}
                  {isToday && <span className="eyebrow text-[0.55rem] text-accent">Heute</span>}
                </dt>
                <dd className={`tabular-nums ${company.hours?.[d]?.length ? '' : 'text-mute'}`}>{formatRanges(company.hours?.[d])}</dd>
              </div>
            );
          })}
        </dl>
      ) : (
        <p className="mt-6 flex-1 text-fg-2">
          Die aktuellen Öffnungszeiten erfahren Sie telefonisch unter{' '}
          <a className="text-fg underline decoration-accent/60 underline-offset-4" href={telHref(company)}>
            {company.phone.display}
          </a>
          .
        </p>
      )}
      <div className="mt-6">
        <OpenStatus />
      </div>
      {company.hours && <p className="mt-3 text-xs text-mute">Reguläre Zeiten – an Feiertagen ggf. abweichend.</p>}
    </div>
  );
}

function MapCard() {
  const [consent, setConsent] = useState(false);
  return (
    <div className="hairline relative h-full min-h-[22rem] overflow-hidden rounded-[1.75rem] bg-ink-2">
      {consent ? (
        <iframe
          title={`Karte: ${company.name}`}
          src={mapsEmbedUrl(company)}
          className="absolute inset-0 h-full w-full [filter:grayscale(1)_invert(0.92)_contrast(0.9)_hue-rotate(180deg)]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      ) : (
        <>
          {/* Stilisierte Karte als Platzhalter – lädt nichts von Dritten */}
          <svg aria-hidden viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
            <rect width="400" height="300" fill="var(--color-ink-2)" />
            <g stroke="rgb(255 255 255 / 0.07)" strokeWidth="1" fill="none">
              {Array.from({ length: 14 }, (_, i) => (
                <path key={i} d={`M${-40 + i * 34} 0 L${40 + i * 30} 300`} />
              ))}
              {Array.from({ length: 10 }, (_, i) => (
                <path key={`h${i}`} d={`M0 ${i * 34} L400 ${10 + i * 30}`} />
              ))}
            </g>
            <path d="M-10 210 C 90 180 150 200 220 150 S 340 90 420 110" stroke="rgb(255 255 255 / 0.18)" strokeWidth="7" fill="none" />
            <path d="M120 -10 C 140 80 180 120 205 150 S 250 260 240 320" stroke="rgb(255 255 255 / 0.12)" strokeWidth="4" fill="none" />
            <circle cx="205" cy="150" r="46" fill="color-mix(in oklab, var(--color-accent) 18%, transparent)" />
          </svg>
          <div className="absolute left-1/2 top-[50%] -translate-x-1/2 -translate-y-full">
            <motion.div
              initial={{ y: -20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ type: 'spring', stiffness: 260, damping: 14, delay: 0.3 }}
              className="grid h-12 w-12 place-items-center rounded-full rounded-bl-none bg-accent text-accent-ink shadow-[0_10px_40px_-5px_var(--color-accent)] [transform:rotate(-45deg)]"
            >
              <Icon name="pin" className="h-5 w-5 rotate-45" />
            </motion.div>
          </div>
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-ink-2 via-ink-2/90 to-transparent p-6 pt-16">
            <p className="text-sm text-fg-2">
              Beim Laden der Karte werden Daten an Google übertragen (siehe{' '}
              <a href="#datenschutz" className="underline underline-offset-4 hover:text-fg">
                Datenschutz
              </a>
              ).
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button onClick={() => setConsent(true)} variant="ghost" iconLeft="map">
                Karte laden
              </Button>
              <Button href={mapsSearchUrl(company)} external variant="ghost" icon="arrow-up-right">
                In Google Maps öffnen
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export function Contact() {
  return (
    <section id="kontakt" aria-labelledby="kontakt-title" className="relative overflow-hidden bg-ink pb-28 pt-28 sm:pb-36 sm:pt-36 lg:pb-44 lg:pt-44">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[60%] bg-[radial-gradient(50%_60%_at_50%_0%,color-mix(in_oklab,var(--color-accent)_14%,transparent),transparent)]" />
      <div className="container-x relative">
        <SectionHeading id="kontakt-title" index="09" label="Kontakt" title="Ein Anruf. Ein Termin." accentWords={['Termin.']} />

        {/* Große Telefonnummer */}
        <Reveal className="mt-14 lg:mt-20">
          <a href={telHref(company)} className="group block" aria-label={`Jetzt anrufen: ${company.phone.display}`}>
            <span className="eyebrow flex items-center gap-3 text-mute">
              <Icon name="phone" className="h-4 w-4 text-accent" />
              Jetzt anrufen
            </span>
            <span className="font-wide relative mt-4 inline-block text-[clamp(2.3rem,8.4vw,8.5rem)] font-extrabold leading-[0.95] tracking-[-0.05em] transition-colors duration-500 group-hover:text-accent">
              {company.phone.display}
              <span className="absolute -bottom-2 left-0 h-[3px] w-full origin-left scale-x-0 bg-accent transition-transform duration-700 ease-[var(--ease-expo)] group-hover:scale-x-100" />
            </span>
          </a>
        </Reveal>

        <div className="mt-16 grid gap-4 lg:grid-cols-12 lg:gap-5">
          <Reveal className="lg:col-span-4">
            <div className="hairline flex h-full flex-col rounded-[1.75rem] bg-ink-2 p-7 sm:p-8">
              <div className="flex items-center gap-3 text-mute">
                <Icon name="pin" className="h-5 w-5 text-accent" />
                <span className="eyebrow">Adresse</span>
              </div>
              <address className="font-semiwide mt-6 flex-1 text-2xl font-bold not-italic leading-snug tracking-[-0.02em]">
                {company.name}
                <span className="mt-3 block font-sans text-lg font-normal tracking-normal text-fg-2">
                  {company.address.street}
                  <br />
                  {cityLine(company)}
                </span>
              </address>
              <div className="mt-8 flex flex-col gap-3">
                <Button href={directionsUrl(company)} external iconLeft="route" className="w-full">
                  Route planen
                </Button>
                <Button href={telHref(company)} variant="ghost" iconLeft="phone" className="w-full">
                  {company.phone.display}
                </Button>
                {company.email && (
                  <Button href={`mailto:${company.email}`} variant="ghost" iconLeft="mail" className="w-full">
                    {company.email}
                  </Button>
                )}
              </div>
            </div>
          </Reveal>
          <Reveal className="lg:col-span-4" delay={0.08}>
            <HoursCard />
          </Reveal>
          <Reveal className="lg:col-span-4" delay={0.16}>
            <MapCard />
          </Reveal>
        </div>

        {/* Abschluss-CTA */}
        <Reveal className="mt-5">
          <div className="relative overflow-hidden rounded-[2rem] bg-accent px-7 py-12 text-accent-ink sm:px-12 sm:py-16">
            <motion.div
              aria-hidden
              className="font-wide pointer-events-none absolute -right-6 top-1/2 -translate-y-1/2 select-none text-[11rem] font-black leading-none tracking-[-0.06em] opacity-[0.09] sm:text-[16rem]"
              initial={{ x: 80 }}
              whileInView={{ x: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 1.6, ease: EASE }}
            >
              {company.initials}
            </motion.div>
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="eyebrow opacity-70">{company.name}</p>
                <p className="font-semiwide mt-4 max-w-2xl text-3xl font-bold leading-[1.05] tracking-[-0.03em] sm:text-5xl">
                  Ihr Fahrzeug. Ihr Termin. Ein Anruf.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button href={telHref(company)} variant="dark" size="lg" iconLeft="phone">
                  Jetzt anrufen
                </Button>
                <Button href="#termin" variant="outline-dark" size="lg" icon="arrow" className="!border-accent-ink/30 !text-accent-ink hover:!border-accent-ink/70">
                  Service anfragen
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
