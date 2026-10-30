import { useEffect, useState } from 'react';
import company from '../lib/company';
import { describeOpenState, openState, type OpenState } from '../lib/hours';

/** Live-Status nach regulären Öffnungszeiten (Europe/Berlin). Wird erst im Browser berechnet. */
export function useOpenState(): OpenState | null {
  const [state, setState] = useState<OpenState | null>(null);
  useEffect(() => {
    const update = () => setState(openState(company.hours));
    update();
    const t = window.setInterval(update, 30_000);
    return () => window.clearInterval(t);
  }, []);
  return state;
}

export function OpenStatus({ className = '', tone = 'dark' }: { className?: string; tone?: 'dark' | 'light' }) {
  const state = useOpenState();
  const open = state?.kind === 'open';
  const unknown = !state || state.kind === 'unknown';
  const dot = open ? 'bg-emerald-400' : unknown ? 'bg-accent' : 'bg-amber-400';
  return (
    <span
      className={`inline-flex items-center gap-2.5 text-sm ${tone === 'dark' ? 'text-fg-2' : 'text-paper-mute'} ${className}`}
      aria-live="polite"
    >
      <span className="relative flex h-2 w-2">
        {open && <span className={`absolute inset-0 rounded-full ${dot} animate-pulse-ring`} />}
        <span className={`relative h-2 w-2 rounded-full ${dot}`} />
      </span>
      <span>{state ? describeOpenState(state) : company.hours ? 'Öffnungszeiten' : 'Öffnungszeiten telefonisch erfragen'}</span>
    </span>
  );
}
