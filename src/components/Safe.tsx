import { Component, type ReactNode } from 'react';

/**
 * Fehlergrenze: Ein Fehler in einem Abschnitt (z. B. WebGL auf einem
 * Handy) darf nie die ganze Seite leeren – React würde sonst den kompletten
 * Baum entfernen und nur der dunkle Hintergrund bliebe stehen.
 */
export class Safe extends Component<
  { children: ReactNode; fallback?: ReactNode; onError?: (error: unknown) => void },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error(error);
    this.props.onError?.(error);
  }

  render() {
    return this.state.failed ? (this.props.fallback ?? null) : this.props.children;
  }
}
