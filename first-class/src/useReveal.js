import { useEffect } from 'react'

/**
 * Blendet Elemente mit `data-reveal` beim Scrollen dezent ein.
 * Inhalte sind ohne JavaScript sofort sichtbar; Elemente, die beim Laden
 * bereits im Bild sind, werden nie versteckt (kein Flackern).
 */
export default function useReveal() {
  useEffect(() => {
    const root = document.documentElement
    const elements = Array.from(document.querySelectorAll('[data-reveal]'))
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduced || !('IntersectionObserver' in window)) {
      elements.forEach((el) => el.classList.add('is-visible'))
      return
    }

    const viewport = window.innerHeight
    const pending = elements.filter((el) => {
      const rect = el.getBoundingClientRect()
      const seen = rect.top < viewport * 0.92
      if (seen) el.classList.add('is-visible')
      return !seen
    })
    root.classList.add('reveal-ready')

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          }
        })
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    pending.forEach((el) => observer.observe(el))
    return () => observer.disconnect()
  }, [])
}
