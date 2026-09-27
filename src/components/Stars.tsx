import { motion } from 'motion/react';
import { useId } from 'react';

const STAR = 'M12 2.8l2.75 5.6 6.15.9-4.45 4.35 1.05 6.13L12 16.9l-5.5 2.88 1.05-6.13L3.1 9.3l6.15-.9L12 2.8z';

/** Fünf Sterne mit anteiliger Füllung (z. B. 4,6 → 4 volle + 60 %). */
export function Stars({ value, className = 'h-4 w-4', animate = true }: { value: number; className?: string; animate?: boolean }) {
  const uid = useId().replace(/:/g, '');
  return (
    <span className="inline-flex items-center gap-[0.18em]" role="img" aria-label={`${value.toString().replace('.', ',')} von 5 Sternen`}>
      {Array.from({ length: 5 }, (_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <motion.svg
            key={i}
            viewBox="0 0 24 24"
            className={className}
            aria-hidden
            initial={animate ? { opacity: 0, scale: 0.4, rotate: -40 } : false}
            whileInView={animate ? { opacity: 1, scale: 1, rotate: 0 } : undefined}
            viewport={{ once: true }}
            transition={{ type: 'spring', stiffness: 260, damping: 16, delay: 0.08 * i }}
          >
            <defs>
              <linearGradient id={`${uid}-${i}`}>
                <stop offset={`${fill * 100}%`} stopColor="var(--color-accent)" />
                <stop offset={`${fill * 100}%`} stopColor="rgb(255 255 255 / 0.18)" />
              </linearGradient>
            </defs>
            <path d={STAR} fill={`url(#${uid}-${i})`} />
          </motion.svg>
        );
      })}
    </span>
  );
}
