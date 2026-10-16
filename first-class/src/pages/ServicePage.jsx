import { site } from '../config.js'
import { serviceBySlug, services } from '../content.js'
import { useLinks } from '../context.js'
import CallButton from '../components/CallButton.jsx'
import CtaBand from '../components/CtaBand.jsx'
import Icon from '../components/Icon.jsx'
import PageHero from '../components/PageHero.jsx'
import Photo from '../components/Photo.jsx'
import ServiceCard from '../components/ServiceCard.jsx'
import Process from '../sections/Process.jsx'

function otherServices(slug) {
  const index = services.findIndex((s) => s.slug === slug)
  return [1, 2, 3].map((offset) => services[(index + offset) % services.length]).filter(
    (service) => service.slug !== slug,
  )
}

export default function ServicePage({ slug }) {
  const links = useLinks()
  const service = serviceBySlug[slug]

  return (
    <>
      <PageHero
        eyebrow="Leistung"
        title={service.title}
        lead={service.teaser}
        crumbs={[
          { label: 'Leistungen', href: `${links.to('home')}#leistungen` },
          { label: service.title },
        ]}
        aside={
          <div className="relative mx-auto max-w-md lg:max-w-none">
            <div
              aria-hidden="true"
              className="hero-fade absolute inset-0 translate-x-4 -translate-y-4 rounded-[2rem] border border-gold-500/40 sm:translate-x-6 sm:-translate-y-6"
              style={{ '--i': 3 }}
            />
            <Photo
              name={service.image}
              priority
              className="hero-photo relative aspect-[5/4] rounded-[2rem] shadow-[0_50px_100px_-40px_rgb(0_0_0/0.9)]"
              sizes="(min-width: 1024px) 38vw, (min-width: 640px) 28rem, 92vw"
            />
          </div>
        }
      >
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center">
          <CallButton showNumber />
          <a href={links.contact(service.slug)} className="btn btn-outline-light">
            Rückruf anfragen
            <Icon name="arrowRight" className="h-4 w-4" />
          </a>
        </div>
      </PageHero>

      <section aria-label={`${service.title} im Detail`} className="bg-cream-50 py-24 lg:py-32">
        <div className="container-x grid gap-16 lg:grid-cols-12 lg:gap-12 xl:gap-20">
          <div className="lg:col-span-7 xl:col-span-8">
            <p
              className="font-display text-[1.8rem] leading-snug text-ink-900 sm:text-[2.1rem]"
              data-reveal
            >
              {service.intro}
            </p>

            <div className="mt-16" data-reveal>
              <h2 className="eyebrow text-gold-700">
                {slug === 'beratung' || slug === 'sicherheitstechnik' ? 'Themen & Lösungen' : 'Wobei wir helfen'}
              </h2>
              <ul className="mt-7 grid gap-4 sm:grid-cols-2">
                {service.situations.map((item) => (
                  <li
                    key={item}
                    className="flex gap-4 rounded-2xl bg-cream-100 p-5 ring-1 ring-ink-900/[0.05]"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-ink-900 text-gold-300">
                      <Icon name="check" className="h-3.5 w-3.5" strokeWidth={2.2} />
                    </span>
                    <span className="text-[0.98rem] leading-relaxed text-graphite">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-16" data-reveal>
              <h2 className="eyebrow text-gold-700">So gehen wir vor</h2>
              <ol className="mt-7 divide-y divide-ink-900/10 border-y border-ink-900/10">
                {service.approach.map((item, index) => (
                  <li key={item} className="flex items-baseline gap-6 py-5">
                    <span className="w-8 shrink-0 font-display text-[1.6rem] text-gold-700 italic">
                      {index + 1}.
                    </span>
                    <span className="text-[1.02rem] leading-relaxed text-graphite">{item}</span>
                  </li>
                ))}
              </ol>
            </div>

            {service.notes?.length > 0 && (
              <div className="mt-16 rounded-[1.5rem] border border-gold-600/30 bg-gold-500/[0.06] p-7 sm:p-8" data-reveal>
                <h2 className="flex items-center gap-3 font-display text-[1.6rem] text-ink-900">
                  <Icon name="info" className="h-6 w-6 text-gold-700" />
                  Gut zu wissen
                </h2>
                <div className="mt-4 space-y-3 text-[1rem] leading-relaxed text-slate">
                  {service.notes.map((note) => (
                    <p key={note}>{note}</p>
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="lg:col-span-5 xl:col-span-4" aria-label="Kontakt">
            <div className="grain overflow-hidden rounded-[1.75rem] bg-ink-900 p-8 text-white lg:sticky lg:top-32" data-reveal>
              <p className="eyebrow text-gold-400">Direkter Kontakt</p>
              <p className="mt-5 font-display text-[1.9rem] leading-tight">
                Wir beraten Sie gern.
              </p>
              <p className="mt-3 text-[0.95rem] leading-relaxed text-mist">
                Rufen Sie uns an. Wir besprechen Ihr Anliegen und informieren Sie vor Arbeitsbeginn
                über die Kosten.
              </p>
              <CallButton className="mt-7 w-full" showNumber />
              <div className="hairline my-8" aria-hidden="true" />
              <ul className="space-y-4 text-[0.92rem] text-mist">
                <li className="flex items-start gap-3">
                  <Icon name="pin" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  <span>
                    <span className="block text-[0.66rem] font-semibold tracking-[0.26em] text-smoke uppercase">
                      Einsatzgebiet
                    </span>
                    <span className="text-white">{site.area}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="clock" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  <span>
                    <span className="block text-[0.66rem] font-semibold tracking-[0.26em] text-smoke uppercase">
                      Öffnungszeiten
                    </span>
                    <span className="text-white">{site.hours}</span>
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <Icon name="transparency" className="mt-0.5 h-4 w-4 shrink-0 text-gold-400" />
                  <span>
                    <span className="block text-[0.66rem] font-semibold tracking-[0.26em] text-smoke uppercase">
                      Kosten
                    </span>
                    <span className="text-white">Klare Information vor Arbeitsbeginn</span>
                  </span>
                </li>
              </ul>
            </div>
          </aside>
        </div>
      </section>

      {slug === 'tueroeffnung' && <Process index={null} className="border-t border-ink-900/[0.06]" />}

      <section aria-labelledby="more-title" className="bg-cream-100 py-24 lg:py-32">
        <div className="container-x">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between" data-reveal>
            <div>
              <p className="eyebrow text-gold-700">Weitere Leistungen</p>
              <h2
                id="more-title"
                className="mt-5 font-display text-[2.3rem] leading-[1.05] font-medium text-ink-900 sm:text-5xl"
              >
                Das könnte Sie auch interessieren.
              </h2>
            </div>
            <a href={`${links.to('home')}#leistungen`} className="link-arrow shrink-0 text-gold-700 hover:text-ink-900">
              Alle Leistungen
              <Icon name="arrowRight" className="h-4 w-4" />
            </a>
          </div>
          <ul className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3 lg:gap-8">
            {otherServices(slug).map((item, index) => (
              <li
                key={item.slug}
                data-reveal
                style={{ '--delay': `${index * 110}ms` }}
                className={index === 2 ? 'sm:hidden lg:block' : ''}
              >
                <ServiceCard service={item} />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <CtaBand topic={service.slug} className="bg-cream-100" />
    </>
  )
}
