import company from '../lib/company';

/** Bildmarke: Tacho-Bogen in Markenfarbe mit Initialen. */
export function BrandSymbol({ className = 'h-10 w-10' }: { className?: string }) {
  const small = company.initials.length > 1;
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <rect x="1" y="1" width="46" height="46" rx="13" fill="#0e1014" stroke="rgb(255 255 255 / 0.1)" />
      <circle cx="24" cy="24" r="15.5" fill="none" stroke="rgb(255 255 255 / 0.12)" strokeWidth="2" strokeDasharray="1.2 3" />
      <path d="M12.2 33.8A15.5 15.5 0 1 1 35.8 33.8" fill="none" stroke="var(--color-accent)" strokeWidth="2.6" strokeLinecap="round" />
      <circle cx="35.8" cy="33.8" r="2" fill="var(--color-accent)" />
      <text
        x="24"
        y={small ? 28.2 : 29.6}
        textAnchor="middle"
        fill="#f3f4f6"
        style={{ fontFamily: 'var(--font-display)', fontStretch: '125%', fontWeight: 800, fontSize: small ? 11 : 15 }}
      >
        {company.initials}
      </text>
    </svg>
  );
}

export function BrandMark({ className = '', compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex min-w-0 items-center gap-3 ${className}`}>
      <BrandSymbol className="h-10 w-10 shrink-0" />
      <span className="flex min-w-0 flex-col leading-none">
        <span className="font-wide truncate whitespace-nowrap text-[0.9rem] font-extrabold uppercase tracking-[0.02em] sm:text-[0.98rem]">
          {company.shortName}
        </span>
        {!compact && (
          <span className="eyebrow mt-1.5 truncate whitespace-nowrap text-[0.56rem] tracking-[0.14em] text-mute sm:text-[0.6rem]">
            {company.descriptor}
          </span>
        )}
      </span>
    </span>
  );
}
