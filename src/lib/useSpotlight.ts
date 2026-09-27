import type { PointerEvent } from 'react';

/** Setzt --mx/--my für den Cursor-Spotlight-Effekt (Klasse `.spotlight`). */
export function spotlightHandler(e: PointerEvent<HTMLElement>) {
  const el = e.currentTarget;
  const r = el.getBoundingClientRect();
  el.style.setProperty('--mx', `${e.clientX - r.left}px`);
  el.style.setProperty('--my', `${e.clientY - r.top}px`);
}
