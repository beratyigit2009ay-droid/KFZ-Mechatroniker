import Lenis from 'lenis';

/** Globale Lenis-Instanz (Smooth Scrolling), `null` bei reduzierter Bewegung. */
let lenis: Lenis | null = null;

export function initSmoothScroll(): () => void {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return () => {};
  lenis = new Lenis({
    duration: 1.15,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 1,
    touchMultiplier: 1.4,
  });
  let raf = 0;
  const loop = (time: number) => {
    lenis?.raf(time);
    raf = requestAnimationFrame(loop);
  };
  raf = requestAnimationFrame(loop);
  return () => {
    cancelAnimationFrame(raf);
    lenis?.destroy();
    lenis = null;
  };
}

const headerOffset = () => -(parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-h')) || 76) - 8;

/** Weiches Scrollen zu einem Anker (#id) oder Element. */
export function scrollToTarget(target: string | HTMLElement, opts: { immediate?: boolean } = {}) {
  const el = typeof target === 'string' ? document.querySelector<HTMLElement>(target) : target;
  if (!el) return;
  if (lenis) {
    // Lenis berücksichtigt `scroll-padding-top` (index.css) bereits – kein zusätzlicher Offset
    lenis.scrollTo(el, { duration: opts.immediate ? 0 : 1.4, immediate: opts.immediate, force: true });
  } else {
    const top = el.getBoundingClientRect().top + window.scrollY + headerOffset();
    window.scrollTo({ top, behavior: opts.immediate ? 'auto' : 'smooth' });
  }
}

export function stopScroll(stop: boolean) {
  if (!lenis) {
    document.documentElement.style.overflow = stop ? 'hidden' : '';
    return;
  }
  if (stop) lenis.stop();
  else lenis.start();
}
