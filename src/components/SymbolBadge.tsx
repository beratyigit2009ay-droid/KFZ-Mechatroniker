import company from '../lib/company';

/** Kennzeichnung, solange Bilder Visualisierungen und keine Fotos des Betriebs sind. */
export function SymbolBadge({ className = '' }: { className?: string }) {
  if (!company.symbolicImages) return null;
  return (
    <span
      className={`eyebrow inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-black/45 px-2.5 py-1 text-[0.58rem] text-fg-2 backdrop-blur-md ${className}`}
      title="3D-Visualisierung – keine Aufnahme aus dem Betrieb"
    >
      <span className="h-1 w-1 rounded-full bg-accent" />
      Symbolbild
    </span>
  );
}
