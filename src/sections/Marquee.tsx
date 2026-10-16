import company from '../lib/company';

/** Endlos laufendes Band mit belegten Eckdaten. */
export function Marquee() {
  const items = company.marquee;
  const row = (hidden: boolean) => (
    <ul className="flex shrink-0 items-center" aria-hidden={hidden || undefined}>
      {items.map((t, i) => (
        <li key={i} className="flex items-center">
          <span className="font-semiwide whitespace-nowrap px-7 text-[1.35rem] font-semibold tracking-[-0.02em] text-fg-2 sm:text-[1.75rem]">
            {t}
          </span>
          <svg viewBox="0 0 10 10" className="h-2.5 w-2.5 shrink-0 text-accent" aria-hidden>
            <path d="M5 0 10 5 5 10 0 5Z" fill="currentColor" />
          </svg>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Eckdaten" className="relative z-10 border-y border-line bg-ink-2 py-6 sm:py-7">
      <div className="mask-fade-x group flex overflow-hidden">
        <div className="flex animate-marquee group-hover:[animation-play-state:paused]" style={{ ['--marquee-duration' as string]: `${items.length * 5}s` }}>
          {row(false)}
          {row(true)}
        </div>
      </div>
    </section>
  );
}
