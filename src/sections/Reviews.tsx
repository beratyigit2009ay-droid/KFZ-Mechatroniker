import { animate, motion, useInView, useMotionValue, useTransform } from 'motion/react';
import { useEffect, useRef } from 'react';
import { Button } from '../components/Button';
import { CountUp } from '../components/CountUp';
import { Reveal } from '../components/Reveal';
import { SectionHeading } from '../components/SectionHeading';
import { Stars } from '../components/Stars';
import company from '../lib/company';
import { mapsSearchUrl } from '../lib/links';

const CX = 200;
const CY = 190;
const START = 150; // Grad, im Uhrzeigersinn ab +x
const SWEEP = 240;

const pt = (r: number, deg: number) => {
  const a = (deg * Math.PI) / 180;
  return [CX + Math.cos(a) * r, CY + Math.sin(a) * r] as const;
};
const arc = (r: number, a0: number, a1: number) => {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  return `M ${x0} ${y0} A ${r} ${r} 0 ${a1 - a0 > 180 ? 1 : 0} 1 ${x1} ${y1}`;
};

/** Rundinstrument im Stil eines Drehzahlmessers – zeigt die Google-Bewertung. */
function RatingGauge({ value }: { value: number }) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.5 });
  const target = START + (value / 5) * SWEEP;
  const angle = useMotionValue(START);
  const needle = useTransform(angle, (a) => `rotate(${a} ${CX} ${CY})`);
  const progress = useTransform(angle, (a) => Math.max(0.001, (a - START) / SWEEP));

  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      angle.set(target);
      return;
    }
    // „Zündung“: Nadel fährt einmal voll aus und pendelt sich dann auf den Wert ein
    const c = animate(angle, [START, START + SWEEP, target], {
      duration: 2.4,
      times: [0, 0.42, 1],
      ease: ['easeOut', [0.34, 1.56, 0.64, 1]],
    });
    return () => c.stop();
  }, [inView, target, angle]);

  const ticks = [];
  for (let i = 0; i <= 50; i++) {
    const v = i / 10;
    const deg = START + (v / 5) * SWEEP;
    const major = i % 10 === 0;
    const half = i % 5 === 0;
    const [x0, y0] = pt(major ? 136 : half ? 142 : 146, deg);
    const [x1, y1] = pt(154, deg);
    ticks.push(
      <line
        key={i}
        x1={x0}
        y1={y0}
        x2={x1}
        y2={y1}
        stroke={v <= value + 1e-6 ? 'var(--color-accent)' : 'rgb(255 255 255 / 0.25)'}
        strokeOpacity={major ? 1 : half ? 0.8 : 0.5}
        strokeWidth={major ? 2.4 : 1.2}
      />,
    );
  }

  return (
    <svg ref={ref} viewBox="0 0 400 330" className="h-auto w-full" role="img" aria-label={`Google-Bewertung: ${value.toString().replace('.', ',')} von 5`}>
      <defs>
        <filter id="gauge-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="6" />
        </filter>
        <radialGradient id="gauge-face">
          <stop offset="0" stopColor="rgb(255 255 255 / 0.06)" />
          <stop offset="1" stopColor="rgb(255 255 255 / 0)" />
        </radialGradient>
      </defs>
      <circle cx={CX} cy={CY} r={128} fill="url(#gauge-face)" />
      <path d={arc(170, START, START + SWEEP)} fill="none" stroke="rgb(255 255 255 / 0.08)" strokeWidth={10} strokeLinecap="round" />
      <motion.path d={arc(170, START, START + SWEEP)} fill="none" stroke="var(--color-accent)" strokeWidth={10} strokeLinecap="round" filter="url(#gauge-glow)" opacity={0.6} style={{ pathLength: progress }} />
      <motion.path d={arc(170, START, START + SWEEP)} fill="none" stroke="var(--color-accent)" strokeWidth={4} strokeLinecap="round" style={{ pathLength: progress }} />
      {ticks}
      {[0, 1, 2, 3, 4, 5].map((v) => {
        const [x, y] = pt(114, START + (v / 5) * SWEEP);
        return (
          <text key={v} x={x} y={y + 5} textAnchor="middle" className="fill-mute font-mono" fontSize="14">
            {v}
          </text>
        );
      })}
      <motion.g transform={needle}>
        <line x1={CX - 18} y1={CY} x2={CX + 150} y2={CY} stroke="var(--color-fg)" strokeWidth={3} strokeLinecap="round" />
        <line x1={CX + 90} y1={CY} x2={CX + 150} y2={CY} stroke="var(--color-accent)" strokeWidth={3} strokeLinecap="round" />
      </motion.g>
      <circle cx={CX} cy={CY} r={13} fill="var(--color-ink-3)" stroke="rgb(255 255 255 / 0.3)" strokeWidth={1.5} />
      <circle cx={CX} cy={CY} r={4} fill="var(--color-accent)" />
    </svg>
  );
}

export function Reviews() {
  const { rating, reviews } = company;
  return (
    <section id="bewertungen" aria-labelledby="bewertungen-title" className="relative overflow-hidden bg-ink-2 py-28 sm:py-36 lg:py-44">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(45%_50%_at_25%_55%,color-mix(in_oklab,var(--color-accent)_12%,transparent),transparent)]" />
      <div className="container-x relative">
        <SectionHeading
          id="bewertungen-title"
          index="06"
          label="Bewertungen"
          title="Bewertet von denen, die es wissen müssen."
          accentWords={['wissen']}
        />

        <div className="mt-14 grid items-center gap-12 lg:mt-20 lg:grid-cols-12 lg:gap-16">
          <Reveal className="mx-auto w-full max-w-[520px] lg:col-span-6">
            <div className="hairline relative rounded-[2.25rem] bg-ink p-6 sm:p-10">
              <div className="relative">
                <RatingGauge value={rating.value} />
                <div className="absolute inset-x-0 bottom-[1%] flex flex-col items-center">
                  <p className="font-wide flex items-baseline text-[2.9rem] font-extrabold leading-none tracking-[-0.05em] sm:text-[3.9rem]">
                    <CountUp value={rating.value} decimals={1} duration={2.2} />
                    <span className="ml-1.5 text-base font-semibold text-mute sm:text-lg">/5</span>
                  </p>
                  <p className="eyebrow mt-2 text-[0.58rem] text-mute">Google · Ø</p>
                </div>
              </div>
            </div>
          </Reveal>

          <div className="lg:col-span-6">
            <Reveal>
              <Stars value={rating.value} className="h-7 w-7 sm:h-9 sm:w-9" />
            </Reveal>
            <Reveal delay={0.1}>
              <p className="font-semiwide mt-7 text-3xl font-bold leading-tight tracking-[-0.03em] sm:text-4xl">
                <CountUp value={rating.count} /> Bewertungen auf Google.
              </p>
            </Reveal>
            <Reveal delay={0.15}>
              <p className="mt-5 max-w-lg text-pretty text-lg leading-relaxed text-fg-2">
                Im Durchschnitt {rating.value.toFixed(1).replace('.', ',')} von 5 Sternen. Die Bewertungen sind öffentlich – lesen Sie selbst,
                was Kundinnen und Kunden über {company.name} schreiben.
              </p>
              <p className="eyebrow mt-4 text-[0.62rem] text-mute">Quelle: Google · Stand {rating.asOf}</p>
            </Reveal>
            <Reveal delay={0.2} className="mt-9 flex flex-col gap-3 sm:flex-row">
              <Button href={mapsSearchUrl(company)} external variant="ghost" iconLeft="google" icon="arrow-up-right">
                Bewertungen auf Google lesen
              </Button>
              <Button href="#termin" icon="arrow">
                Termin vereinbaren
              </Button>
            </Reveal>
          </div>
        </div>

        {/* Nur echte, vom Betrieb freigegebene Bewertungstexte (siehe company.ts → reviews) */}
        {reviews.length > 0 && (
          <ul className="mt-20 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reviews.map((r, i) => (
              <Reveal as="li" key={i} delay={i * 0.08}>
                <figure className="hairline h-full rounded-[1.75rem] bg-ink p-7">
                  <Stars value={r.rating} className="h-4 w-4" animate={false} />
                  <blockquote className="mt-5 text-pretty text-lg leading-relaxed">„{r.text}“</blockquote>
                  <figcaption className="mt-6 text-sm text-mute">
                    {r.author}
                    {r.date ? ` · ${r.date}` : ''} · Google
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
