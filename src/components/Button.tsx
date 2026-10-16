import { motion, useMotionValue, useSpring, useTransform } from 'motion/react';
import type { MouseEvent, PointerEvent, ReactNode } from 'react';
import { scrollToTarget } from '../lib/scroll';
import { Icon, type IconKey } from './Icon';

type Variant = 'primary' | 'ghost' | 'dark' | 'outline-dark';

interface ButtonProps {
  children: ReactNode;
  href?: string;
  onClick?: (e: MouseEvent<HTMLElement>) => void;
  variant?: Variant;
  size?: 'md' | 'lg';
  icon?: IconKey;
  iconLeft?: IconKey;
  external?: boolean;
  className?: string;
  ariaLabel?: string;
  magnetic?: boolean;
  type?: 'button' | 'submit';
}

const base =
  'group relative inline-flex select-none items-center justify-center gap-3 overflow-hidden rounded-full font-medium tracking-[-0.01em] transition-[background,color,box-shadow,border-color] duration-500 ease-[var(--ease-expo)] will-change-transform';

const variants: Record<Variant, string> = {
  primary:
    'bg-accent text-accent-ink shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_60%,white),0_18px_50px_-12px_color-mix(in_oklab,var(--color-accent)_70%,transparent)] hover:shadow-[0_0_0_1px_color-mix(in_oklab,var(--color-accent)_60%,white),0_24px_70px_-10px_color-mix(in_oklab,var(--color-accent)_85%,transparent)]',
  ghost: 'glass text-fg hover:border-line-2 hover:bg-white/10',
  dark: 'bg-paper-ink text-paper hover:bg-black',
  'outline-dark': 'border border-paper-ink/20 text-paper-ink hover:border-paper-ink/60',
};

const sizes = {
  md: 'h-12 px-6 text-[0.95rem]',
  lg: 'h-14 px-7 text-base sm:h-[3.75rem] sm:px-8',
};

/**
 * Button/Link mit magnetischem Hover (nur bei feinem Zeiger), Lichtkante und
 * gleitendem Pfeil. Anker-Links (#…) scrollen weich über Lenis.
 */
export function Button({
  children,
  href,
  onClick,
  variant = 'primary',
  size = 'md',
  icon,
  iconLeft,
  external,
  className = '',
  ariaLabel,
  magnetic = true,
  type = 'button',
}: ButtonProps) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 18, mass: 0.4 });
  const ix = useTransform(sx, (v) => v * 0.45);
  const iy = useTransform(sy, (v) => v * 0.45);

  const onMove = (e: PointerEvent<HTMLElement>) => {
    if (!magnetic || e.pointerType !== 'mouse') return;
    const r = e.currentTarget.getBoundingClientRect();
    x.set(((e.clientX - r.left) / r.width - 0.5) * 14);
    y.set(((e.clientY - r.top) / r.height - 0.5) * 12);
  };
  const onLeave = () => {
    x.set(0);
    y.set(0);
  };

  const handleClick = (e: MouseEvent<HTMLElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    if (href?.startsWith('#')) {
      e.preventDefault();
      scrollToTarget(href);
      history.replaceState(null, '', href);
    }
  };

  const content = (
    <>
      {variant === 'primary' && (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-1/3 -translate-x-[120%] skew-x-[-18deg] bg-gradient-to-r from-transparent via-white/45 to-transparent opacity-0 transition-opacity duration-300 group-hover:animate-shimmer group-hover:opacity-100"
        />
      )}
      <motion.span style={{ x: ix, y: iy }} className="relative z-[1] inline-flex items-center gap-3">
        {iconLeft && <Icon name={iconLeft} className="h-[1.15em] w-[1.15em] shrink-0" />}
        <span className="whitespace-nowrap">{children}</span>
        {icon && (
          <span className="relative -mr-1 inline-flex h-[1.15em] w-[1.15em] shrink-0 overflow-hidden">
            <Icon
              name={icon}
              className="absolute inset-0 h-full w-full transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-[130%]"
            />
            <Icon
              name={icon}
              className="absolute inset-0 h-full w-full -translate-x-[130%] transition-transform duration-500 ease-[var(--ease-expo)] group-hover:translate-x-0"
            />
          </span>
        )}
      </motion.span>
    </>
  );

  const cls = `${base} ${variants[variant]} ${sizes[size]} ${className}`;

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={handleClick}
        onPointerMove={onMove}
        onPointerLeave={onLeave}
        style={{ x: sx, y: sy }}
        className={cls}
        aria-label={ariaLabel}
        {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      >
        {content}
      </motion.a>
    );
  }
  return (
    <motion.button
      type={type}
      onClick={handleClick}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      style={{ x: sx, y: sy }}
      className={cls}
      aria-label={ariaLabel}
    >
      {content}
    </motion.button>
  );
}
