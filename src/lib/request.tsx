import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { scrollToTarget } from './scroll';

interface RequestState {
  concern: string | null;
  setConcern: (c: string | null) => void;
  /** Anliegen übernehmen und zur Anfrage-Vorbereitung scrollen. */
  request: (concern?: string) => void;
}

const RequestContext = createContext<RequestState | null>(null);

export function RequestProvider({ children }: { children: ReactNode }) {
  const [concern, setConcern] = useState<string | null>(null);
  const request = useCallback((c?: string) => {
    if (c) setConcern(c);
    scrollToTarget('#termin');
  }, []);
  const value = useMemo(() => ({ concern, setConcern, request }), [concern, request]);
  return <RequestContext.Provider value={value}>{children}</RequestContext.Provider>;
}

export function useRequest() {
  const ctx = useContext(RequestContext);
  if (!ctx) throw new Error('useRequest außerhalb von RequestProvider');
  return ctx;
}
