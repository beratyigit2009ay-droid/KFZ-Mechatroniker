export function LogoMark({ className = 'h-10 w-10' }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true" focusable="false">
      <circle cx="20" cy="20" r="19" fill="none" stroke="currentColor" strokeWidth="1" />
      <circle
        cx="20"
        cy="20"
        r="15.6"
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.4"
        strokeWidth="0.6"
      />
      <circle cx="20" cy="16.4" r="3.5" fill="currentColor" />
      <path d="M18.1 18.9 17 27.4h6l-1.1-8.5z" fill="currentColor" />
    </svg>
  )
}

export default function Logo({ tone = 'light', compact = false }) {
  const text = tone === 'light' ? 'text-white' : 'text-ink-900'
  const sub = tone === 'light' ? 'text-gold-400' : 'text-gold-700'
  return (
    <span className="flex items-center gap-3">
      <LogoMark className={`${compact ? 'h-9 w-9' : 'h-10 w-10'} shrink-0 text-gold-400`} />
      <span className="leading-none">
        <span
          className={`block font-display text-[1.42rem] font-semibold tracking-[0.2em] ${text}`}
        >
          FIRST CLASS
        </span>
        <span className={`mt-1.5 block text-[0.56rem] font-semibold tracking-[0.46em] uppercase ${sub}`}>
          Schlüsseldienst
        </span>
      </span>
    </span>
  )
}
