import { useEffect, useRef, useState } from 'react'
import { site } from '../config.js'
import { useLinks } from '../context.js'
import CallButton from './CallButton.jsx'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

export function useNavItems() {
  const links = useLinks()
  return [
    { label: 'Startseite', href: links.home, current: links.page === 'home' },
    { label: 'Türöffnung', href: links.to('tueroeffnung'), current: links.page === 'tueroeffnung' },
    {
      label: 'Schlosswechsel',
      href: links.to('schlosswechsel'),
      current: links.page === 'schlosswechsel',
    },
    {
      label: 'Sicherheitstechnik',
      href: links.to('sicherheitstechnik'),
      current: links.page === 'sicherheitstechnik',
    },
    { label: 'Über uns', href: links.section('ueber-uns') },
    { label: 'Kontakt', href: links.section('kontakt') },
  ]
}

export default function Header() {
  const links = useLinks()
  const items = useNavItems()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  const menuRef = useRef(null)
  const toggleRef = useRef(null)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (!open) return
    const { overflow } = document.body.style
    document.body.style.overflow = 'hidden'
    menuRef.current?.querySelector('a')?.focus()

    const onKey = (event) => {
      if (event.key === 'Escape') {
        setOpen(false)
        toggleRef.current?.focus()
      }
    }
    const onResize = () => window.innerWidth >= 1280 && setOpen(false)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', onResize)
    return () => {
      document.body.style.overflow = overflow
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', onResize)
    }
  }, [open])

  const solid = scrolled || open

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-500 ${
        solid
          ? 'border-white/[0.07] bg-ink-950/90 backdrop-blur-xl'
          : 'border-transparent bg-transparent'
      }`}
    >
      <div
        className={`container-x flex items-center justify-between gap-6 transition-[height] duration-500 ${
          solid ? 'h-[4.5rem]' : 'h-20 lg:h-24'
        }`}
      >
        <a
          href={links.home}
          className="rounded-md"
          aria-label={`${site.name} ${site.descriptor} – zur Startseite`}
        >
          <Logo />
        </a>

        <nav aria-label="Hauptnavigation" className="hidden xl:block">
          <ul className="flex items-center gap-8">
            {items.map((item) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  className="nav-link"
                  aria-current={item.current ? 'page' : undefined}
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <CallButton size="sm" className="hidden sm:inline-flex" />
          <button
            ref={toggleRef}
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-white transition-colors hover:border-gold-400 hover:text-gold-300 xl:hidden"
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
            onClick={() => setOpen((value) => !value)}
          >
            <Icon name={open ? 'close' : 'menu'} className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        id="mobile-menu"
        ref={menuRef}
        hidden={!open}
        className="grain h-[calc(100dvh-4.5rem)] overflow-y-auto border-t border-white/[0.07] bg-ink-950 xl:hidden"
      >
        <nav aria-label="Mobile Navigation" className="container-x flex min-h-full flex-col py-8">
          <ul className="divide-y divide-white/[0.07]">
            {items.map((item, index) => (
              <li key={item.label}>
                <a
                  href={item.href}
                  onClick={() => setOpen(false)}
                  aria-current={item.current ? 'page' : undefined}
                  className="group flex items-center justify-between py-4 font-display text-[1.9rem] leading-none text-white transition-colors hover:text-gold-300 aria-[current=page]:text-gold-300"
                >
                  <span>
                    <span
                      aria-hidden="true"
                      className="mr-4 font-sans text-[0.7rem] tracking-[0.2em] text-gold-500 tabular-nums"
                    >
                      0{index + 1}
                    </span>
                    {item.label}
                  </span>
                  <Icon
                    name="arrowRight"
                    className="h-5 w-5 text-gold-400 transition-transform group-hover:translate-x-1"
                  />
                </a>
              </li>
            ))}
          </ul>

          <div className="mt-auto pt-10">
            <CallButton className="w-full" showNumber />
            <p className="mt-5 text-center text-sm text-smoke">
              Einsatzgebiet: <span className="text-mist">{site.area}</span>
            </p>
            <p className="mt-1 text-center text-sm text-smoke">
              Erreichbar: <span className="text-mist">{site.hours}</span>
            </p>
          </div>
        </nav>
      </div>
    </header>
  )
}
