import { BrandMark } from '../components/BrandMark';
import { Icon } from '../components/Icon';
import company from '../lib/company';
import { summarizeHours } from '../lib/hours';
import { cityLine, directionsUrl, telHref } from '../lib/links';
import { scrollToTarget } from '../lib/scroll';
import { NAV_LINKS } from './Nav';

export function Footer() {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden border-t border-line bg-ink-2 pb-28 pt-20 md:pb-10">
      <div className="container-x">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <BrandMark />
            <p className="mt-6 max-w-xs text-sm leading-relaxed text-mute">
              {company.name} – {company.industry.replaceAll(' / ', ', ')} in {company.address.city}
              {company.address.district ? `-${company.address.district}` : ''}.
            </p>
          </div>

          <div className="lg:col-span-3">
            <p className="eyebrow text-[0.62rem] text-mute">Kontakt</p>
            <ul className="mt-5 space-y-3 text-[0.95rem] text-fg-2">
              <li>
                <a href={telHref(company)} className="inline-flex items-center gap-2 hover:text-fg">
                  <Icon name="phone" className="h-4 w-4 text-accent" />
                  {company.phone.display}
                </a>
              </li>
              <li>
                <a href={directionsUrl(company)} target="_blank" rel="noopener noreferrer" className="inline-flex items-start gap-2 hover:text-fg">
                  <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    {company.address.street}
                    <br />
                    {cityLine(company)}
                  </span>
                </a>
              </li>
              {company.email && (
                <li>
                  <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 hover:text-fg">
                    <Icon name="mail" className="h-4 w-4 text-accent" />
                    {company.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          <div className="lg:col-span-3">
            <p className="eyebrow text-[0.62rem] text-mute">Öffnungszeiten</p>
            <ul className="mt-5 space-y-2 text-[0.95rem] text-fg-2">
              {company.hours ? (
                summarizeHours(company.hours).map((g) => (
                  <li key={g.days} className="flex gap-3">
                    <span className="w-16 shrink-0 text-fg">{g.days}</span>
                    <span className="tabular-nums">{g.times}</span>
                  </li>
                ))
              ) : (
                <li>Telefonisch erfragen</li>
              )}
            </ul>
          </div>

          <nav aria-label="Fußzeile" className="lg:col-span-2">
            <p className="eyebrow text-[0.62rem] text-mute">Seite</p>
            <ul className="mt-5 space-y-2 text-[0.95rem] text-fg-2">
              {NAV_LINKS.map((l) => (
                <li key={l.href}>
                  <a
                    href={l.href}
                    onClick={(e) => {
                      e.preventDefault();
                      scrollToTarget(l.href);
                    }}
                    className="hover:text-fg"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <div className="mt-16 flex flex-col gap-4 border-t border-line pt-8 text-sm text-mute sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {year} {company.name}
          </p>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            <a href="#impressum" className="hover:text-fg">
              Impressum
            </a>
            <a href="#datenschutz" className="hover:text-fg">
              Datenschutz
            </a>
            {company.draft && (
              <span className="eyebrow rounded-full border border-line px-2.5 py-1 text-[0.55rem]" title="Diese Seite ist ein Gestaltungsentwurf und noch nicht vom Betrieb freigegeben.">
                Konzeptentwurf
              </span>
            )}
            <button
              type="button"
              onClick={() => scrollToTarget('#top')}
              className="inline-flex items-center gap-2 hover:text-fg"
            >
              Nach oben
              <Icon name="arrow" className="h-4 w-4 -rotate-90" />
            </button>
          </div>
        </div>
      </div>

      <div
        aria-hidden
        className="font-wide pointer-events-none mt-14 select-none whitespace-nowrap text-center text-[17vw] font-black uppercase leading-[0.75] tracking-[-0.05em] text-transparent [-webkit-text-stroke:1px_rgb(255_255_255/0.08)] [mask-image:linear-gradient(to_bottom,#000_30%,transparent)]"
      >
        {company.shortName}
      </div>
    </footer>
  );
}
