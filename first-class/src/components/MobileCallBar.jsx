import { useEffect, useState } from 'react'
import { site, telHref } from '../config.js'
import Icon from './Icon.jsx'

/**
 * Fixierter Anrufbutton am unteren Rand – nur auf dem Handy und nur dann,
 * wenn gerade kein anderer Anrufbutton der Seite im Bild ist.
 */
export default function MobileCallBar() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll('main a[href^="tel:"]'))
    if (!('IntersectionObserver' in window) || targets.length === 0) {
      setShow(true)
      return
    }
    const visible = new Set()
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) =>
          entry.isIntersecting ? visible.add(entry.target) : visible.delete(entry.target),
        )
        setShow(visible.size === 0)
      },
      { threshold: 0.6 },
    )
    targets.forEach((target) => observer.observe(target))
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className={`fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-ink-950/92 px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur-xl transition-transform duration-500 ease-[var(--ease-soft)] sm:hidden ${
        show ? 'translate-y-0' : 'translate-y-[110%]'
      }`}
      inert={!show}
    >
      <a
        href={telHref()}
        className="btn btn-gold w-full"
        aria-label={`Jetzt anrufen: ${site.phone}`}
      >
        <Icon name="phone" className="h-[1.1rem] w-[1.1rem]" strokeWidth={1.8} />
        <span>Jetzt anrufen</span>
        <span className="hidden font-medium tracking-[0.06em] normal-case opacity-75 min-[400px]:inline">
          · {site.phone}
        </span>
      </a>
    </div>
  )
}
