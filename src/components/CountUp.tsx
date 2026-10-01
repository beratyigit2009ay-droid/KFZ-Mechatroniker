import { animate, useInView } from 'motion/react';
import { useEffect, useRef, useState } from 'react';

/** Zählt beim Einscrollen von 0 auf den Zielwert (deutsche Schreibweise). */
export function CountUp({ value, decimals = 0, duration = 1.8, className = '' }: { value: number; decimals?: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.8 });
  const fmt = (v: number) => v.toFixed(decimals).replace('.', ',');
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    if (!inView) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setText(fmt(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inView, value]);
  return (
    <span ref={ref} className={`tabular-nums ${className}`}>
      {text}
    </span>
  );
}
