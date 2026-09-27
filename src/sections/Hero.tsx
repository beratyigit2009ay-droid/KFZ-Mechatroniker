import { motion, useScroll, useTransform } from 'motion/react';
import { lazy, Suspense, useEffect, useRef, useState } from 'react';
import { Button } from '../components/Button';
import { OpenStatus } from '../components/OpenStatus';
import { EASE } from '../components/Reveal';
import { Stars } from '../components/Stars';
import company, { heroImage } from '../lib/company';
import { formatRating, telHref } from '../lib/links';
import { scrollToTarget } from '../lib/scroll';

const Hero3D = lazy(() => import('../components/Hero3D'));

function canUse3D(): { ok: boolean; lowPower: boolean } {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // ?static erzwingt das Poster (z. B. für Screenshots/Tests)
  if (new URLSearchParams(window.location.search).has('static')) return { ok: false, lowPower: true };
  const conn = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (reduce || conn?.saveData) return { ok: false, lowPower: true };
  try {
    const c = document.createElement('canvas');
    if (!(c.getContext('webgl2') || c.getContext('webgl'))) return { ok: false, lowPower: true };
  } catch {
    return { ok: false, lowPower: true };
  }
  const lowPower =
    window.matchMedia('(pointer: coarse)').matches ||
    (navigator.hardwareConcurrency ?? 8) <= 4 ||
    window.innerWidth < 768;
  return { ok: true, lowPower };
}

/** Zeile der Headline, wortweise aus der Maske geschoben. */
function TitleLine({ text, delay, accent }: { text: string; delay: number; accent: boolean }) {
  const words = text.split(' ');
  return (
    <span className={`block ${accent ? 'text-accent' : ''}`}>
      {words.map((w, i) => (
        <span key={i} className="inline-block overflow-hidden pb-[0.08em] align-top">
          <motion.span
            className="inline-block origin-bottom-left"
            initial={{ y: '115%', rotate: 4 }}
            animate={{ y: '0%', rotate: 0 }}
            transition={{ duration: 1.25, ease: EASE, delay: delay + i * 0.07 }}
          >
            {w}
            {i < words.length - 1 ? ' ' : ''}
          </motion.span>
        </span>
      ))}
    </span>
  );
}

export function Hero() {
  const ref = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] });
  const contentY = useTransform(scrollYProgress, [0, 1], ['0%', '-22%']);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const visualScale = useTransform(scrollYProgress, [0, 1], [1, 1.28]);
  const visualY = useTransform(scrollYProgress, [0, 1], ['0%', '16%']);
  const wordmarkX = useTransform(scrollYProgress, [0, 1], ['0%', '-12%']);
  const ringRotate = useTransform(scrollYProgress, [0, 1], [0, 90]);

  const [three, setThree] = useState<{ ok: boolean; lowPower: boolean } | null>(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(true);

  useEffect(() => {
    // 3D erst nach dem ersten Rendern laden – das Poster sorgt für einen schnellen ersten Eindruck
    const start = () => setThree(canUse3D());
    const ric = (window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number })
      .requestIdleCallback;
    const id = ric ? ric(start, { timeout: 1200 }) : window.setTimeout(start, 400);
    return () => {
      if (!ric) window.clearTimeout(id);
    };
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0 });
    io.observe(el);
    const onVis = () => setActive(!document.hidden && el.getBoundingClientRect().bottom > 0);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const [lineA, lineB] = company.hero.title;

  return (
    <section
      ref={ref}
      id="top"
      aria-labelledby="hero-title"
      className="relative isolate min-h-[100svh] overflow-hidden bg-ink"
    >
      {/* ── Hintergrund ── */}
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(60%_55%_at_72%_48%,color-mix(in_oklab,var(--color-accent)_16%,transparent),transparent_70%)] max-lg:bg-[radial-gradient(90%_45%_at_60%_28%,color-mix(in_oklab,var(--color-accent)_18%,transparent),transparent_70%)]" />
        <div className="tech-grid absolute inset-0 [mask-image:radial-gradient(70%_60%_at_65%_45%,#000,transparent)]" />
        <motion.div
          style={{ x: wordmarkX }}
          className="font-wide text-outline absolute -bottom-[0.18em] left-[-0.04em] whitespace-nowrap text-[26vw] font-black uppercase leading-none tracking-[-0.04em] lg:text-[19vw]"
        >
          {company.shortName}
        </motion.div>
        {/* Lichtkegel von oben */}
        <div className="absolute left-[55%] top-[-20%] h-[80%] w-[40%] -translate-x-1/2 rotate-[14deg] bg-[linear-gradient(180deg,rgb(255_255_255/0.07),transparent_75%)] blur-3xl max-lg:hidden" />
      </div>

      {/* ── 3D-Visual ── */}
      <motion.div
        style={{ scale: visualScale, y: visualY }}
        className="pointer-events-none absolute right-[-30vw] top-[calc(var(--header-h)-1.25rem)] aspect-square w-[104vw] sm:right-[-16vw] sm:top-[4svh] sm:w-[84vw] lg:right-[-5vw] lg:top-[52%] lg:w-[min(58vw,1000px)] lg:-translate-y-1/2"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.8, ease: EASE, delay: 0.2 }}
          className="absolute inset-0"
        >
          {/* HUD-Ringe */}
          <motion.svg
            style={{ rotate: ringRotate }}
            viewBox="0 0 100 100"
            className="absolute inset-[3%] h-[94%] w-[94%] text-white"
            aria-hidden
          >
            <circle cx="50" cy="50" r="46" fill="none" stroke="currentColor" strokeOpacity="0.08" strokeWidth="0.15" />
            <circle
              cx="50"
              cy="50"
              r="48.5"
              fill="none"
              stroke="currentColor"
              strokeOpacity="0.14"
              strokeWidth="0.25"
              strokeDasharray="0.3 1.6"
            />
            <path
              d="M50 1.5 A48.5 48.5 0 0 1 96.1 35"
              fill="none"
              stroke="var(--color-accent)"
              strokeOpacity="0.7"
              strokeWidth="0.35"
              strokeLinecap="round"
            />
            {Array.from({ length: 4 }, (_, i) => (
              <line
                key={i}
                x1="50"
                y1="0.5"
                x2="50"
                y2="3"
                stroke="currentColor"
                strokeOpacity="0.35"
                strokeWidth="0.25"
                transform={`rotate(${i * 90} 50 50)`}
              />
            ))}
          </motion.svg>
          <img
            src={heroImage}
            alt=""
            width={1400}
            height={1400}
            fetchPriority="high"
            decoding="async"
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-700 ${ready ? 'opacity-0' : 'opacity-100'}`}
          />
          {three?.ok && (
            <Suspense fallback={null}>
              <div className={`absolute inset-0 transition-opacity duration-700 ${ready ? 'opacity-100' : 'opacity-0'}`}>
                <Hero3D
                  progress={scrollYProgress}
                  active={active}
                  onReady={() => setReady(true)}
                  onSlow={() => {
                    setReady(false);
                    setThree({ ok: false, lowPower: true });
                  }}
                  lowPower={three.lowPower}
                />
              </div>
            </Suspense>
          )}
        </motion.div>
      </motion.div>

      {/* Lesbarkeit auf kleinen Screens */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[62%] bg-gradient-to-t from-ink from-40% via-ink/80 to-transparent lg:h-[40%] lg:from-0% lg:via-ink/40"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-ink/80 to-transparent lg:block"
      />

      {/* ── Inhalt ── */}
      <motion.div
        style={{ y: contentY, opacity: contentOpacity }}
        className="container-x relative flex min-h-[100svh] flex-col pb-16 pt-[max(24.5rem,52svh)] sm:pt-[max(26rem,50svh)] lg:justify-center lg:pb-16 lg:pt-36"
      >
        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, ease: EASE, delay: 0.1 }}
          className="eyebrow flex items-center gap-3 text-fg-2"
        >
          <span className="h-px w-8 bg-accent" />
          {company.hero.eyebrow}
        </motion.p>

        <h1
          id="hero-title"
          className="display-xl mt-6 max-w-[13ch] text-balance sm:max-w-none"
          // Lange Zeilen verkleinern, damit die Headline links vom Rad bleibt
          style={{ ['--hero-fit' as string]: `${(52 / (Math.max(lineA.length, lineB.length) * 0.6)).toFixed(2)}vw` }}
        >
          <span className="sr-only">
            {company.name}:{' '}
          </span>
          <TitleLine text={lineA} delay={0.25} accent={company.hero.accentLine === 0} />{' '}
          <TitleLine text={lineB} delay={0.45} accent={company.hero.accentLine === 1} />
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.8 }}
          className="mt-7 max-w-[34rem] text-pretty text-[1.05rem] leading-relaxed text-fg-2 sm:text-lg"
        >
          {company.hero.text}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.1, ease: EASE, delay: 0.95 }}
          className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center"
        >
          <Button href="#termin" size="lg" icon="arrow" className="w-full sm:w-auto">
            Termin vereinbaren
          </Button>
          <Button href={telHref(company)} size="lg" variant="ghost" iconLeft="phone" className="w-full sm:w-auto">
            Jetzt anrufen · {company.phone.display}
          </Button>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.2, delay: 1.2 }}
          className="mt-10 flex flex-wrap items-center gap-x-6 gap-y-3"
        >
          <a
            href="#bewertungen"
            onClick={(e) => {
              e.preventDefault();
              scrollToTarget('#bewertungen');
            }}
            className="group inline-flex items-center gap-3"
          >
            <Stars value={company.rating.value} className="h-4 w-4" />
            <span className="text-sm text-fg-2">
              <strong className="font-semibold text-fg">{formatRating(company.rating.value)}</strong> ·{' '}
              <span className="underline decoration-white/20 underline-offset-4 transition group-hover:decoration-accent">
                {company.rating.count} Google-Bewertungen
              </span>
            </span>
          </a>
          <span className="hidden h-4 w-px bg-line-2 sm:block" />
          <OpenStatus />
        </motion.div>
      </motion.div>

      {/* Scroll-Hinweis */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.6, duration: 1 }}
        className="pointer-events-none absolute bottom-7 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-3 lg:flex"
        aria-hidden
      >
        <span className="eyebrow text-[0.6rem] text-mute">Scrollen</span>
        <span className="relative h-12 w-px overflow-hidden bg-line">
          <motion.span
            className="absolute inset-x-0 top-0 h-1/2 bg-accent"
            animate={{ y: ['-100%', '200%'] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </span>
      </motion.div>
    </section>
  );
}
