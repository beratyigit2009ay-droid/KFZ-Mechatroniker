import { motion, type Variants } from 'motion/react';
import { createElement, type ReactNode } from 'react';

export const EASE = [0.16, 1, 0.3, 1] as const;

/** Wortweise Masken-Animation für Headlines. */
export function RevealText({
  text,
  as = 'h2',
  className = '',
  delay = 0,
  stagger = 0.055,
  accentWords = [],
  once = true,
  immediate = false,
  id,
}: {
  id?: string;
  text: string;
  as?: 'h1' | 'h2' | 'h3' | 'p' | 'span';
  className?: string;
  delay?: number;
  stagger?: number;
  accentWords?: string[];
  once?: boolean;
  /** sofort beim Mount statt beim Einscrollen animieren */
  immediate?: boolean;
}) {
  const words = text.split(' ');
  const container: Variants = { hidden: {}, show: { transition: { staggerChildren: stagger, delayChildren: delay } } };
  const item: Variants = {
    hidden: { y: '112%', rotate: 3 },
    show: { y: '0%', rotate: 0, transition: { duration: 1.1, ease: EASE } },
  };
  return createElement(
    motion[as] as unknown as string,
    {
      id,
      className,
      variants: container,
      initial: 'hidden',
      ...(immediate ? { animate: 'show' } : { whileInView: 'show', viewport: { once, amount: 0.5 } }),
    },
    words.map((w, i) => (
      <span key={i} className="inline-block overflow-hidden pb-[0.1em] align-top leading-[inherit]">
        <motion.span
          variants={item}
          className={`inline-block origin-bottom-left ${accentWords.includes(w) ? 'text-accent' : ''}`}
        >
          {w}
          {i < words.length - 1 ? ' ' : ''}
        </motion.span>
      </span>
    )),
  );
}

/** Weiches Einblenden beim Scrollen. */
export function Reveal({
  children,
  className = '',
  delay = 0,
  y = 28,
  as = 'div',
  amount = 0.25,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  as?: 'div' | 'li' | 'section' | 'article' | 'p' | 'span';
  amount?: number;
}) {
  const Comp = motion[as];
  return (
    <Comp
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 1, ease: EASE, delay }}
    >
      {children}
    </Comp>
  );
}
