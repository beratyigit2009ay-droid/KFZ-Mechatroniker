import { site, telHref } from '../config.js'
import { services } from '../content.js'
import { useLinks } from '../context.js'
import Icon from './Icon.jsx'
import Logo from './Logo.jsx'

export default function Footer() {
  const links = useLinks()
  const year = new Date().getFullYear()

  return (
    <footer className="grain bg-ink-950 text-mist" aria-labelledby="footer-title">
      <h2 id="footer-title" className="sr-only">
        Fußzeile
      </h2>
      <div className="container-x pt-20 pb-10 lg:pt-24">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-4">
            <a href={links.home} className="inline-block rounded-md" aria-label="Zur Startseite">
              <Logo />
            </a>
            <p className="mt-7 max-w-sm text-[0.95rem] leading-relaxed">
              {site.name} ist Ihr Schlüsseldienst für Türöffnungen, Schlosswechsel und
              Sicherheitstechnik – mit klarer Kosteninformation vor Arbeitsbeginn und einem
              sorgfältigen Umgang mit Ihrem Eigentum.
            </p>
          </div>

          <div className="lg:col-span-3">
            <h3 className="text-[0.7rem] font-semibold tracking-[0.28em] text-gold-400 uppercase">
              Kontakt
            </h3>
            <ul className="mt-6 space-y-4 text-[0.95rem]">
              <li>
                <a
                  href={telHref()}
                  className="group inline-flex items-center gap-3 text-white transition-colors hover:text-gold-300"
                >
                  <Icon name="phone" className="h-4 w-4 text-gold-400" />
                  {site.phone}
                </a>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <span>
                  <span className="sr-only">Einsatzgebiet: </span>
                  {site.area}
                </span>
              </li>
              <li className="flex items-start gap-3">
                <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                <span>
                  <span className="sr-only">Erreichbarkeit: </span>
                  {site.hours}
                </span>
              </li>
            </ul>
          </div>

          <nav className="lg:col-span-3" aria-label="Leistungen">
            <h3 className="text-[0.7rem] font-semibold tracking-[0.28em] text-gold-400 uppercase">
              Leistungen
            </h3>
            <ul className="mt-6 grid grid-cols-2 gap-x-6 gap-y-3 text-[0.95rem] lg:grid-cols-1">
              {services.map((service) => (
                <li key={service.slug}>
                  <a
                    href={links.to(service.slug)}
                    className="transition-colors hover:text-gold-300"
                  >
                    {service.title}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          <nav className="lg:col-span-2" aria-label="Rechtliches">
            <h3 className="text-[0.7rem] font-semibold tracking-[0.28em] text-gold-400 uppercase">
              Rechtliches
            </h3>
            <ul className="mt-6 space-y-3 text-[0.95rem]">
              <li>
                <a href={links.to('impressum')} className="transition-colors hover:text-gold-300">
                  Impressum
                </a>
              </li>
              <li>
                <a href={links.to('datenschutz')} className="transition-colors hover:text-gold-300">
                  Datenschutzerklärung
                </a>
              </li>
              <li>
                <a href={links.section('kontakt')} className="transition-colors hover:text-gold-300">
                  Kontakt
                </a>
              </li>
            </ul>
          </nav>
        </div>

        <div className="hairline mt-16" />

        <div className="mt-8 flex flex-col gap-3 text-[0.8rem] text-smoke sm:flex-row sm:items-center sm:justify-between">
          <p suppressHydrationWarning>
            © {year} {site.name} {site.descriptor}
          </p>
          <p>
            Fotos:{' '}
            <a
              href="https://www.pexels.com"
              className="underline decoration-white/20 underline-offset-4 transition-colors hover:text-gold-300"
              rel="noopener"
            >
              Pexels
            </a>
          </p>
        </div>
      </div>
      {/* Platz für den fixierten Anrufbutton auf Mobilgeräten */}
      <div className="h-[calc(5rem+env(safe-area-inset-bottom))] lg:hidden" aria-hidden="true" />
    </footer>
  )
}
