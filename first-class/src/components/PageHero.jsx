import { useLinks } from '../context.js'
import Icon from './Icon.jsx'

/** Kopfbereich für Unterseiten inkl. Brotkrumen-Navigation. */
export default function PageHero({ eyebrow, title, lead, crumbs = [], children, aside }) {
  const links = useLinks()
  return (
    <section
      aria-labelledby="page-title"
      className="grain relative overflow-hidden bg-ink-950 text-white"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-56 right-[-15%] h-[48rem] w-[48rem] rounded-full bg-[radial-gradient(closest-side,rgb(196_158_86/0.15),transparent)]"
      />
      <div
        className={`container-x relative grid items-center gap-14 pt-32 pb-20 sm:pt-36 lg:pt-44 lg:pb-28 ${
          aside ? 'lg:grid-cols-12 lg:gap-12' : ''
        }`}
      >
        <div className={aside ? 'lg:col-span-7' : 'max-w-3xl'}>
          <nav aria-label="Brotkrumen" className="hero-rise" style={{ '--i': 0 }}>
            <ol className="flex flex-wrap items-center gap-2 text-[0.78rem] text-smoke">
              <li>
                <a href={links.to('home')} className="transition-colors hover:text-gold-300">
                  Startseite
                </a>
              </li>
              {crumbs.map((crumb) => (
                <li key={crumb.label} className="flex items-center gap-2">
                  <Icon name="chevronRight" className="h-3.5 w-3.5 text-gold-600" />
                  {crumb.href ? (
                    <a href={crumb.href} className="transition-colors hover:text-gold-300">
                      {crumb.label}
                    </a>
                  ) : (
                    <span aria-current="page" className="text-mist">
                      {crumb.label}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
          {eyebrow && (
            <p className="eyebrow hero-rise mt-10 text-gold-400" style={{ '--i': 1 }}>
              {eyebrow}
            </p>
          )}
          <h1
            id="page-title"
            className="hero-rise mt-6 font-display text-[3rem] leading-[0.98] font-medium sm:text-[4.2rem] xl:text-[5rem]"
            style={{ '--i': 2 }}
          >
            {title}
          </h1>
          {lead && (
            <p
              className="hero-rise mt-7 max-w-xl text-[1.1rem] leading-relaxed text-mist sm:text-lg"
              style={{ '--i': 3 }}
            >
              {lead}
            </p>
          )}
          {children && (
            <div className="hero-rise mt-10" style={{ '--i': 4 }}>
              {children}
            </div>
          )}
        </div>
        {aside && <div className="lg:col-span-5">{aside}</div>}
      </div>
      <div className="hairline absolute inset-x-0 bottom-0" aria-hidden="true" />
    </section>
  )
}
