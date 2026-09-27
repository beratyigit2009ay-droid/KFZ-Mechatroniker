import { motion } from 'motion/react';

/**
 * Generische Coupé-Silhouette als Linienzeichnung (keine reale Marke/kein reales Modell).
 * viewBox 1000 × 380, Fahrtrichtung rechts.
 */
const BODY =
  'M70 296 C56 290 50 270 52 246 C54 226 60 212 76 206 L150 196 C190 190 222 176 262 150 C312 118 380 98 460 94 C530 92 575 100 612 122 C650 146 690 176 720 184 C790 192 870 200 920 214 C944 222 956 238 955 258 C954 280 948 292 930 298 L841.5 298 A64 64 0 1 0 724.5 298 L283.5 298 A64 64 0 1 0 166.5 298 L70 296 Z';
const GLASS = 'M290 172 C318 140 380 112 460 108 C525 106 568 114 600 134 C622 148 640 162 652 174 Z';
const DETAILS = [
  'M505 109 L499 173', // B-Säule
  'M660 180 C664 220 664 262 657 296', // Vordertür
  'M499 175 L495 296', // Hintertür
  'M925 236 C760 226 520 222 72 228', // Schulterlinie
  'M292 286 L718 286', // Schweller
  'M676 181 C688 170 706 170 712 181 L690 188 Z', // Spiegel
];
const HEADLIGHT = 'M920 222 C900 219 872 216 846 214 C862 226 892 233 934 235';
const TAILLIGHT = 'M58 214 L120 206 L118 216 L57 224 Z';

function Wheel({ cx, delay }: { cx: number; delay: number }) {
  const cy = 272;
  return (
    <g>
      <motion.circle
        cx={cx}
        cy={cy}
        r={56}
        fill="rgb(255 255 255 / 0.02)"
        stroke="rgb(255 255 255 / 0.55)"
        strokeWidth={1.6}
        initial={{ pathLength: 0 }}
        whileInView={{ pathLength: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 1.4, delay, ease: 'easeInOut' }}
      />
      <circle cx={cx} cy={cy} r={40} fill="none" stroke="rgb(255 255 255 / 0.3)" strokeWidth={1.2} />
      <path
        d={`M ${cx + 30 * Math.cos(-1.1)} ${cy + 30 * Math.sin(-1.1)} A 30 30 0 0 1 ${cx + 30 * Math.cos(-0.25)} ${cy + 30 * Math.sin(-0.25)}`}
        fill="none"
        stroke="var(--color-accent)"
        strokeWidth={5}
        strokeLinecap="round"
      />
      <motion.g
        style={{ originX: `${cx}px`, originY: `${cy}px` }}
        animate={{ rotate: 360 }}
        transition={{ duration: 14, repeat: Infinity, ease: 'linear' }}
      >
        {Array.from({ length: 5 }, (_, i) => {
          const a = (i / 5) * Math.PI * 2 - Math.PI / 2;
          return (
            <line
              key={i}
              x1={cx + Math.cos(a) * 11}
              y1={cy + Math.sin(a) * 11}
              x2={cx + Math.cos(a) * 38}
              y2={cy + Math.sin(a) * 38}
              stroke="rgb(255 255 255 / 0.45)"
              strokeWidth={3}
              strokeLinecap="round"
            />
          );
        })}
        <circle cx={cx} cy={cy} r={8} fill="none" stroke="rgb(255 255 255 / 0.5)" strokeWidth={1.4} />
      </motion.g>
    </g>
  );
}

export function CarOutline({ className = '' }: { className?: string }) {
  const draw = (delay: number, duration = 2.2) => ({
    initial: { pathLength: 0, opacity: 0 },
    whileInView: { pathLength: 1, opacity: 1 },
    viewport: { once: true, amount: 0.4 },
    transition: { pathLength: { duration, delay, ease: [0.65, 0, 0.35, 1] as const }, opacity: { duration: 0.3, delay } },
  });
  return (
    <svg viewBox="0 0 1000 380" className={className} aria-hidden>
      <defs>
        <linearGradient id="car-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="rgb(255 255 255 / 0.08)" />
          <stop offset="1" stopColor="rgb(255 255 255 / 0.01)" />
        </linearGradient>
        <linearGradient id="car-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="rgb(255 255 255 / 0.14)" />
          <stop offset="0.6" stopColor="rgb(255 255 255 / 0.03)" />
        </linearGradient>
        <radialGradient id="car-shadow">
          <stop offset="0" stopColor="rgb(0 0 0 / 0.9)" />
          <stop offset="1" stopColor="rgb(0 0 0 / 0)" />
        </radialGradient>
        <linearGradient id="car-ground" x1="0" x2="1">
          <stop offset="0" stopColor="rgb(255 255 255 / 0)" />
          <stop offset="0.5" stopColor="rgb(255 255 255 / 0.25)" />
          <stop offset="1" stopColor="rgb(255 255 255 / 0)" />
        </linearGradient>
      </defs>
      <ellipse cx="500" cy="332" rx="470" ry="16" fill="url(#car-shadow)" />
      <line x1="10" y1="331" x2="990" y2="331" stroke="url(#car-ground)" strokeWidth="1" />

      <motion.path d={BODY} fill="url(#car-body)" stroke="rgb(255 255 255 / 0.75)" strokeWidth={1.8} strokeLinejoin="round" {...draw(0)} />
      <motion.path d={GLASS} fill="url(#car-glass)" stroke="rgb(255 255 255 / 0.5)" strokeWidth={1.4} {...draw(0.5, 1.6)} />
      {DETAILS.map((d, i) => (
        <motion.path key={i} d={d} fill="none" stroke="rgb(255 255 255 / 0.28)" strokeWidth={1.2} strokeLinecap="round" {...draw(0.9 + i * 0.1, 1.4)} />
      ))}
      <motion.path d={HEADLIGHT} fill="none" stroke="var(--color-accent)" strokeWidth={2.4} strokeLinecap="round" {...draw(1.6, 1)} />
      <motion.path d={TAILLIGHT} fill="color-mix(in oklab, var(--color-accent) 35%, transparent)" stroke="var(--color-accent)" strokeWidth={1.4} {...draw(1.6, 1)} />
      <path d="M600 196 L628 196 M440 196 L466 196" stroke="rgb(255 255 255 / 0.35)" strokeWidth={3} strokeLinecap="round" />
      <Wheel cx={225} delay={0.4} />
      <Wheel cx={783} delay={0.6} />
    </svg>
  );
}
