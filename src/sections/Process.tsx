import { motion, useScroll, useTransform } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { Icon } from '../components/Icon';
import { OpenStatus } from '../components/OpenStatus';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { AREAS } from '../lib/areas';
import company from '../lib/company';
import { telHref } from '../lib/links';
import { useRequest } from '../lib/request';

const STEPS = [
  { title: 'Anrufen', text: '' }, // Text mit klickbarer Nummer, siehe unten
  { title: 'Anliegen schildern', text: 'Fahrzeug, Anzeichen, Wunschzeitraum – kurz beschrieben ist schnell geklärt.' },
  { title: 'Termin abstimmen', text: 'Gemeinsam finden Sie einen Termin, der passt.' },
  { title: 'Fahrzeug bringen', text: `Zur vereinbarten Zeit in die ${company.address.street}.` },
];

const TIMEFRAMES = ['So bald wie möglich', 'Diese Woche', 'Nächste Woche', 'Flexibel'];
const STORAGE_KEY = `kfz-anfrage-${company.slug}`;

interface Draft {
  concerns: string[];
  vehicle: string;
  year: string;
  mileage: string;
  timeframe: string;
  note: string;
}
const EMPTY: Draft = { concerns: [], vehicle: '', year: '', mileage: '', timeframe: '', note: '' };

function buildNote(d: Draft): string {
  const lines = [`Anfrage an ${company.name}`];
  if (d.concerns.length) lines.push(`Anliegen: ${d.concerns.join(', ')}`);
  const car = [d.vehicle, d.year && `Baujahr ${d.year}`, d.mileage && `${d.mileage} km`].filter(Boolean).join(' · ');
  if (car) lines.push(`Fahrzeug: ${car}`);
  if (d.timeframe) lines.push(`Wunschzeitraum: ${d.timeframe}`);
  if (d.note.trim()) lines.push(`Beschreibung: ${d.note.trim()}`);
  return lines.join('\n');
}

function Chip({ on, children, onClick }: { on: boolean; children: React.ReactNode; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={`rounded-full border px-3.5 py-2 text-sm transition-all duration-300 ${
        on ? 'border-accent bg-accent text-accent-ink' : 'border-line bg-white/[0.03] text-fg-2 hover:border-line-2 hover:text-fg'
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children, htmlFor }: { label: string; children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="flex flex-col gap-2">
      <span className="eyebrow text-[0.62rem] text-mute">{label}</span>
      {children}
    </label>
  );
}

const inputCls =
  'h-12 w-full rounded-xl border border-line bg-ink/60 px-4 text-fg placeholder:text-mute/70 transition-colors focus:border-accent focus:outline-none';

function RequestBuilder() {
  const { concern } = useRequest();
  const [d, setD] = useState<Draft>(EMPTY);
  const [copied, setCopied] = useState(false);
  const [flash, setFlash] = useState(false);
  const id = useId();
  const loaded = useRef(false);

  // Entwurf nur lokal im Browser merken (Komfortfunktion, keine Übertragung)
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setD({ ...EMPTY, ...JSON.parse(raw) });
    } catch {
      /* Speicher nicht verfügbar – egal */
    }
    loaded.current = true;
  }, []);
  useEffect(() => {
    if (!loaded.current) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(d));
    } catch {
      /* ignorieren */
    }
  }, [d]);

  useEffect(() => {
    if (!concern) return;
    setD((prev) => (prev.concerns.includes(concern) ? prev : { ...prev, concerns: [...prev.concerns, concern] }));
    setFlash(true);
    const t = window.setTimeout(() => setFlash(false), 1600);
    return () => window.clearTimeout(t);
  }, [concern]);

  const options = useMemo(() => {
    const set = new Set<string>([...company.services.map((s) => s.title), ...AREAS.map((a) => a.label), 'Sonstiges']);
    d.concerns.forEach((c) => set.add(c));
    return [...set];
  }, [d.concerns]);

  const note = buildNote(d);
  const hasContent = note.includes('\n');
  const toggle = (c: string) =>
    setD((p) => ({ ...p, concerns: p.concerns.includes(c) ? p.concerns.filter((x) => x !== c) : [...p.concerns, c] }));

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(note);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  };

  return (
    <div className="panel relative overflow-hidden rounded-[2rem] p-6 sm:p-9">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="eyebrow text-accent">Anfrage vorbereiten</p>
          <h3 className="font-semiwide mt-3 text-2xl font-bold tracking-[-0.02em] sm:text-3xl">Alles parat für den Anruf.</h3>
        </div>
        <span className="inline-flex items-center gap-2 rounded-full border border-line px-3 py-1.5 text-xs text-mute">
          <Icon name="shield" className="h-3.5 w-3.5" />
          Bleibt auf Ihrem Gerät
        </span>
      </div>

      <form className="relative mt-8 flex flex-col gap-7" onSubmit={(e) => e.preventDefault()}>
        <fieldset>
          <legend className="eyebrow mb-3 text-[0.62rem] text-mute">Anliegen</legend>
          <motion.div
            animate={flash ? { scale: [1, 1.015, 1] } : {}}
            transition={{ duration: 0.5 }}
            className="flex flex-wrap gap-2"
          >
            {options.map((o) => (
              <Chip key={o} on={d.concerns.includes(o)} onClick={() => toggle(o)}>
                {o}
              </Chip>
            ))}
          </motion.div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-[1.6fr_1fr_1fr]">
          <Field label="Fahrzeug" htmlFor={`${id}-v`}>
            <input
              id={`${id}-v`}
              className={inputCls}
              placeholder="Marke & Modell"
              autoComplete="off"
              value={d.vehicle}
              onChange={(e) => setD({ ...d, vehicle: e.target.value })}
            />
          </Field>
          <Field label="Baujahr" htmlFor={`${id}-y`}>
            <input
              id={`${id}-y`}
              className={inputCls}
              inputMode="numeric"
              placeholder="z. B. 2018"
              maxLength={4}
              value={d.year}
              onChange={(e) => setD({ ...d, year: e.target.value.replace(/\D/g, '') })}
            />
          </Field>
          <Field label="Kilometerstand" htmlFor={`${id}-k`}>
            <input
              id={`${id}-k`}
              className={inputCls}
              inputMode="numeric"
              placeholder="z. B. 85.000"
              value={d.mileage}
              onChange={(e) => {
                const n = e.target.value.replace(/\D/g, '').slice(0, 7);
                setD({ ...d, mileage: n ? Number(n).toLocaleString('de-DE') : '' });
              }}
            />
          </Field>
        </div>

        <fieldset>
          <legend className="eyebrow mb-3 text-[0.62rem] text-mute">Wunschzeitraum</legend>
          <div className="flex flex-wrap gap-2">
            {TIMEFRAMES.map((t) => (
              <Chip key={t} on={d.timeframe === t} onClick={() => setD({ ...d, timeframe: d.timeframe === t ? '' : t })}>
                {t}
              </Chip>
            ))}
          </div>
        </fieldset>

        <Field label="Beschreibung (optional)" htmlFor={`${id}-n`}>
          <textarea
            id={`${id}-n`}
            rows={3}
            className={`${inputCls} h-auto resize-none py-3`}
            placeholder="Was ist Ihnen aufgefallen? Seit wann?"
            value={d.note}
            onChange={(e) => setD({ ...d, note: e.target.value })}
          />
        </Field>

        {/* Gesprächsnotiz */}
        <div className="relative rounded-2xl border border-dashed border-line-2 bg-ink/50 p-5">
          <div className="flex items-center justify-between">
            <span className="eyebrow text-[0.62rem] text-mute">Ihre Gesprächsnotiz</span>
            {hasContent && (
              <button type="button" onClick={() => setD(EMPTY)} className="text-xs text-mute underline-offset-4 hover:text-fg hover:underline">
                Zurücksetzen
              </button>
            )}
          </div>
          <pre aria-live="polite" className="mt-3 whitespace-pre-wrap font-mono text-[0.82rem] leading-relaxed text-fg-2">
            {hasContent ? note : 'Wählen Sie oben Ihr Anliegen – hier entsteht Ihre Notiz für das Telefonat.'}
          </pre>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button href={telHref(company)} size="lg" iconLeft="phone" className="sm:flex-1">
            Jetzt anrufen
          </Button>
          <Button onClick={copy} size="lg" variant="ghost" iconLeft={copied ? 'check' : 'copy'} className="sm:flex-1">
            {copied ? 'Kopiert' : 'Notiz kopieren'}
          </Button>
          {company.email && (
            <Button
              href={`mailto:${company.email}?subject=${encodeURIComponent('Terminanfrage')}&body=${encodeURIComponent(note)}`}
              size="lg"
              variant="ghost"
              iconLeft="mail"
              className="sm:flex-1"
            >
              Per E-Mail
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

export function Process() {
  const list = useRef<HTMLOListElement>(null);
  const { scrollYProgress } = useScroll({ target: list, offset: ['start 75%', 'end 55%'] });
  const fill = useTransform(scrollYProgress, [0, 1], [0, 1]);

  return (
    <section id="termin" aria-labelledby="termin-title" className="relative bg-ink py-28 sm:py-36 lg:py-44">
      <div className="container-x">
        <SectionHeading
          id="termin-title"
          index="07"
          label="Termin"
          title="In vier Schritten zum Termin."
          accentWords={['Termin.']}
          intro={
            <>
              Der schnellste Weg führt über das Telefon. Mit der Anfrage-Vorbereitung haben Sie dabei alle Angaben griffbereit.
              <span className="mt-4 block">
                <OpenStatus />
              </span>
            </>
          }
        />

        <div className="mt-16 grid gap-14 lg:mt-24 lg:grid-cols-12 lg:gap-16">
          <ol ref={list} className="relative lg:col-span-5">
            <span aria-hidden className="absolute bottom-6 left-[1.35rem] top-6 w-px bg-line" />
            <motion.span
              aria-hidden
              style={{ scaleY: fill }}
              className="absolute bottom-6 left-[1.35rem] top-6 w-px origin-top bg-accent shadow-[0_0_12px_var(--color-accent)]"
            />
            {STEPS.map((s, i) => (
              <Reveal as="li" key={s.title} delay={i * 0.06} className="relative flex gap-6 pb-12 last:pb-0">
                <span className="glass relative z-[1] grid h-11 w-11 shrink-0 place-items-center rounded-full font-mono text-sm text-fg">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="pt-1.5">
                  <h3 className="font-semiwide text-2xl font-bold tracking-[-0.02em]">{s.title}</h3>
                  <p className="mt-2 max-w-sm text-fg-2">
                    {i === 0 ? (
                      <>
                        Rufen Sie an:{' '}
                        <a href={telHref(company)} className="text-fg underline decoration-accent/60 underline-offset-4 hover:decoration-accent">
                          {company.phone.display}
                        </a>
                        . {company.hours ? 'Erreichbar zu den Öffnungszeiten.' : ''}
                      </>
                    ) : (
                      s.text
                    )}
                  </p>
                </div>
              </Reveal>
            ))}
          </ol>

          <Reveal className="lg:col-span-7" delay={0.1}>
            <RequestBuilder />
          </Reveal>
        </div>
      </div>
    </section>
  );
}
